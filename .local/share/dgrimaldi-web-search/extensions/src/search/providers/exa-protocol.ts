import { err, ok, Result } from "../../shared/result";
import { SearchDepth } from "../domain/SearchDepth";
import { SearchProviderRequest } from "./providers";
import {
  isSseResponse,
  parseMcpPayload,
  parseSseMcpResponse,
  ProtocolMessage,
  ProtocolParseError,
} from "./utils";

const DEFAULT_CONTEXT_MAX_CHARACTERS = 2_000;

type ExaDepth = "auto" | "fast";

interface ExaMcpRequestDto {
  readonly jsonrpc: "2.0";
  readonly id: 1;
  readonly method: "tools/call";
  readonly params: {
    readonly name: "web_search_exa";
    readonly arguments: {
      readonly query: string;
      readonly type: ExaDepth;
      readonly numResults: number;
      readonly livecrawl: "fallback";
      readonly contextMaxCharacters: number;
    };
  };
}

/** Map public web-tools search depth to Exa's supported protocol depth. */
function normalizeExaDepth(depth: SearchDepth): ExaDepth {
  return depth === "deep" ? "fast" : depth;
}

/** Encode an Exa MCP search request DTO. */
export function encodeExaSearchRequest(input: SearchProviderRequest): ExaMcpRequestDto {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "web_search_exa",
      arguments: {
        query: input.query,
        type: normalizeExaDepth(input.depth),
        numResults: input.maxResults,
        livecrawl: "fallback",
        contextMaxCharacters: DEFAULT_CONTEXT_MAX_CHARACTERS,
      },
    },
  };
}

/** Parse Exa MCP JSON or SSE responses into safe protocol messages. */
export function parseExaMcpResponse(
  body: string,
  contentType: string,
): Result<readonly ProtocolMessage[], ProtocolParseError> {
  if (isSseResponse(body, contentType)) {
    return parseSseMcpResponse(body);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return err({ _tag: "InvalidJson", source: "json" });
  }

  const messages = parseMcpPayload(payload);
  if (messages._tag === "err") {
    return messages;
  }
  if (messages.value.length === 0) {
    return err({ _tag: "NoMcpMessages" });
  }
  return messages;
}
