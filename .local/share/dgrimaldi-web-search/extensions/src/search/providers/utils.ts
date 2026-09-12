import { err, ok, Result } from "../../shared/result";

export function isSseResponse(body: string, contentType: string): boolean {
  return contentType.toLowerCase().includes("text/event-stream") || /^data:/m.test(body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ProtocolMessage =
  | { readonly _tag: "Text"; readonly text: string }
  | { readonly _tag: "ProviderError"; readonly safeMessage: string };

export type ProtocolParseError =
  | { readonly _tag: "InvalidJson"; readonly source: "sse" | "json" }
  | { readonly _tag: "InvalidMcpPayload"; readonly reason: string }
  | { readonly _tag: "NoMcpMessages" };

/**
 * Parse a JSON-RPC MCP response payload into protocol messages.
 *
 * @typeParam TMessage - The message type (e.g. `ExaProtocolMessage` or `TavilyProtocolMessage`)
 */

export function parseMcpPayload(
  payload: unknown,
): Result<readonly ProtocolMessage[], ProtocolParseError> {
  if (!isRecord(payload)) {
    return err({ _tag: "InvalidMcpPayload", reason: "Expected an object payload" });
  }

  if (isRecord(payload["error"])) {
    return ok([{ _tag: "ProviderError", safeMessage: "Search provider returned an error" }]);
  }

  const result = payload["result"];
  if (!isRecord(result)) {
    return err({ _tag: "InvalidMcpPayload", reason: "Missing result object" });
  }

  const content = result["content"];
  if (!Array.isArray(content)) {
    return err({ _tag: "InvalidMcpPayload", reason: "Missing result.content array" });
  }

  if (result["isError"] === true) {
    return ok([{ _tag: "ProviderError", safeMessage: "Search provider returned an error" }]);
  }

  const messages: ProtocolMessage[] = [];
  for (const item of content) {
    if (!isRecord(item)) {
      continue;
    }
    if (item["type"] !== "text" || typeof item["text"] !== "string") {
      continue;
    }
    const text = item["text"].trim();
    if (text) {
      messages.push({ _tag: "Text", text });
    }
  }

  return ok(messages);
}

/** Extract data payloads from an SSE event stream. */
export function parseSseDataLines(input: string): string[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("data:")) {
      current.push(line.slice(5).trim());
      continue;
    }
    if (!line.trim() && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current.join("\n"));
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

export function parseSseMcpResponse(
  body: string,
): Result<readonly ProtocolMessage[], ProtocolParseError> {
  const chunks = parseSseDataLines(body);
  const messages: ProtocolMessage[] = [];
  let sawInvalidJson = false;
  let firstPayloadError: ProtocolParseError | undefined;

  for (const chunk of chunks) {
    let payload: unknown;
    try {
      payload = JSON.parse(chunk);
    } catch {
      sawInvalidJson = true;
      continue;
    }

    const parsed = parseMcpPayload(payload);
    if (parsed._tag === "err") {
      firstPayloadError ??= parsed.error;
      continue;
    }
    messages.push(...parsed.value);
  }

  if (messages.length > 0) {
    return ok(messages);
  }
  if (sawInvalidJson) {
    return err({ _tag: "InvalidJson", source: "sse" });
  }
  if (firstPayloadError) {
    return err(firstPayloadError);
  }
  return err({ _tag: "NoMcpMessages" });
}
