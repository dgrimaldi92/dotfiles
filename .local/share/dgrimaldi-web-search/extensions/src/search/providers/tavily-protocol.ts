import { err, Result } from "../../shared/result";
import { SearchDepth } from "../domain/SearchDepth";
import { SearchProviderRequest } from "./providers";
import {
  parseMcpPayload,
  isSseResponse,
  parseSseMcpResponse,
  ProtocolMessage,
  ProtocolParseError,
} from "./utils";

type TavilyDepth = "basic" | "advanced" | "fast" | "ultra-fast";

interface TavilyMcpRequestDto {
  readonly jsonrpc: "2.0";
  readonly id: 1;
  readonly method: "tools/call";
  readonly params: {
    readonly name: "tavily_search";
    readonly arguments: {
      readonly query: string;
      readonly search_depth: TavilyDepth;
      readonly max_results: number;
    };
  };
}

/** Map public web-tools search depth to Tavily's supported protocol depth. */
function normalizeTavilyDepth(depth: SearchDepth): TavilyDepth {
  switch (depth) {
    case "auto":
      return "basic";
    case "fast":
      return "fast";
    case "deep":
      return "advanced";
  }
}

export function encodeTavilySearchRequest(input: SearchProviderRequest): TavilyMcpRequestDto {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "tavily_search",
      arguments: {
        query: input.query,
        search_depth: normalizeTavilyDepth(input.depth),
        max_results: input.maxResults,
      },
    },
  };
}

export function parseTavilyMcpResponse(
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
