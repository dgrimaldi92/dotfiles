import { isIP } from "node:net";

interface ComposedSignal {
  signal: AbortSignal;
  cleanup: () => void;
}
interface ReadBodyResult {
  buffer: Buffer;
  bytes: number;
}

class OperationTimeoutError extends Error {
  readonly _tag = "OperationTimeout" as const;

  constructor(readonly timeoutSeconds: number) {
    super(`Operation timed out after ${timeoutSeconds}s`);
    this.name = "OperationTimeoutError";
  }
}

export function isOperationTimeoutError(value: unknown): value is OperationTimeoutError {
  return (
    value instanceof OperationTimeoutError ||
    (typeof value === "object" &&
      value !== null &&
      "_tag" in value &&
      value._tag === "OperationTimeout")
  );
}

export function createOperationSignal(
  timeoutMs: number,
  outerSignal?: AbortSignal,
): ComposedSignal {
  const controller = new AbortController();
  const timeoutSeconds = Math.ceil(timeoutMs / 1000);
  const timeoutId = setTimeout(() => {
    controller.abort(new OperationTimeoutError(timeoutSeconds));
  }, timeoutMs);
  const signal = outerSignal
    ? AbortSignal.any([outerSignal, controller.signal])
    : controller.signal;
  return {
    signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<ReadBodyResult> {
  if (!response.body) {
    return { buffer: Buffer.alloc(0), bytes: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let bytes = 0;

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel(signal.reason).catch(() => undefined);
        throw signal.reason instanceof Error ? signal.reason : new Error("Operation cancelled");
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(
          `Response too large (exceeds ${Math.floor(maxBytes / (1024 * 1024))}MB limit)`,
        );
      }

      chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
    }
  } finally {
    reader.releaseLock();
  }

  return {
    buffer: Buffer.concat(chunks),
    bytes,
  };
}

function normalizeCharset(charset: string | undefined): string | undefined {
  if (!charset) return undefined;
  const normalized = charset.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "utf8") return "utf-8";
  return normalized;
}

export function decodeTextBuffer(
  buffer: Buffer,
  charset?: string,
): { text: string; decoder: string } {
  const normalizedCharset = normalizeCharset(charset);
  if (normalizedCharset) {
    try {
      return {
        text: new TextDecoder(normalizedCharset).decode(buffer),
        decoder: normalizedCharset,
      };
    } catch {
      // Fall back to utf-8 below.
    }
  }
  return {
    text: new TextDecoder("utf-8").decode(buffer),
    decoder: "utf-8",
  };
}

function parseIpv4CompatibleIpv6Address(ip: string): string | undefined {
  const prefix = "::";
  if (!ip.startsWith(prefix)) {
    return undefined;
  }

  const suffix = ip.slice(prefix.length);
  const segments = suffix.split(":");
  if (segments.length !== 2) {
    return undefined;
  }

  const high = parseIpv6Hex16(segments[0]);
  const low = parseIpv6Hex16(segments[1]);
  if (high === undefined || low === undefined) {
    return undefined;
  }

  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

export function isPrivateOrLocalIp(input: string): boolean {
  const ip = normalizeIpLiteral(input);
  if (!ip) return false;

  const mappedIpv4 = parseIpv4MappedIpv6Address(ip);
  if (mappedIpv4) {
    return isPrivateOrLocalIp(mappedIpv4);
  }

  const compatibleIpv4 = parseIpv4CompatibleIpv6Address(ip);
  if (compatibleIpv4) {
    return isPrivateOrLocalIp(compatibleIpv4);
  }

  const version = isIP(ip);
  if (version === 4) {
    const octets = ip.split(".").map((part) => Number.parseInt(part, 10));
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (version === 6) {
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(ip)) return true;
    return false;
  }
  return false;
}
function parseIpv6Hex16(segment: string | undefined): number | undefined {
  if (!segment || !/^[0-9a-f]{1,4}$/i.test(segment)) {
    return undefined;
  }

  const value = Number.parseInt(segment, 16);
  return Number.isFinite(value) && value >= 0 && value <= 0xffff ? value : undefined;
}

function parseIpv4MappedIpv6Address(ip: string): string | undefined {
  const prefix = "::ffff:";
  if (!ip.startsWith(prefix)) {
    return undefined;
  }

  const suffix = ip.slice(prefix.length);
  if (isIP(suffix) === 4) {
    return suffix;
  }

  const segments = suffix.split(":");
  if (segments.length !== 2) {
    return undefined;
  }

  const high = parseIpv6Hex16(segments[0]);
  const low = parseIpv6Hex16(segments[1]);
  if (high === undefined || low === undefined) {
    return undefined;
  }

  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

function normalizeIpLiteral(input: string): string {
  const ip = stripIpv6Brackets(input).toLowerCase();
  if (isIP(ip) !== 6) {
    return ip;
  }

  try {
    return stripIpv6Brackets(new URL(`http://[${ip}]/`).hostname).toLowerCase();
  } catch {
    return ip;
  }
}

export function stripIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

export function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
