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
