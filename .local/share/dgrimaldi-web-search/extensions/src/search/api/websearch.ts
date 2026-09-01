import { StringEnum } from "@earendil-works/pi-ai";
import Type from "typebox";
import { renderCall, renderResult } from "@/search/presentation/tui";
import type {
  ParseSearchQueryError,
  WebSearchDetails,
  WebToolsSettings,
} from "@/search/domain/types";
import { SEARCH_DEPTHS } from "@/search/domain/config";
import type {
  PiToolResult,
  ToolOutputStore,
  ToolOutputStoreError,
} from "@/search/presentation/agent-view";
import type { SearchWeb, SearchWebError } from "@/search/composition/web-search";

export interface WebSearchToolComposition {
  readonly settings: WebToolsSettings["search"];
  readonly searchWeb: SearchWeb;
  readonly outputStore: ToolOutputStore;
}

type ToolInputParseError =
  | { readonly _tag: "InvalidToolInput"; readonly message: string }
  | { readonly _tag: "InvalidToolField"; readonly field: string; readonly message: string }
  | { readonly _tag: "UnknownToolField"; readonly field: string };

type WebSearchBoundaryError =
  | ToolInputParseError
  | ParseSearchQueryError
  | SearchWebError
  | ToolOutputStoreError;

export const toToolError = (error: WebSearchBoundaryError) =>
  new Error(describeWebSearchError(error));

export function createWebSearchTool(composition?: WebSearchToolComposition) {
  return {
    name: "websearch",
    label: "Web Search",
    description:
      "Search the public web for current information and candidate URLs to inspect with webfetch.",
    promptSnippet: "Search the public web for current information and relevant URLs",
    promptGuidelines: [
      "Use websearch when the user needs current public-web information or when the right URL is not yet known.",
      "After picking a promising result, use webfetch on that URL for deeper inspection.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query." }),
      maxResults: Type.Optional(
        Type.Number({
          description:
            "Maximum number of results to return. Overrides the web-tools search default max results setting.",
        }),
      ),
      depth: Type.Optional(
        StringEnum([...SEARCH_DEPTHS], {
          description:
            "Search depth. Overrides the web-tools search default depth setting. Provider support may vary.",
        }),
      ),
    }),

    async execute(
      _toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: (update: PiToolResult<WebSearchDetails>) => void,
    ) {
      const actualComposition = composition ?? createDefaultWebSearchComposition();
      const parsed = parseWebSearchToolParams(params, actualComposition.settings);
      if (parsed._tag === "err") {
        throw toWebSearchToolError(parsed.error);
      }

      const composed = createOperationSignal(parsed.value.timeoutSeconds * 1000, signal);
      onUpdate?.({
        content: [textContent(`Searching for ${JSON.stringify(parsed.value.query)}...`)],
        details: {
          query: parsed.value.query,
          depth: parsed.value.depth,
          maxResults: parsed.value.maxResults,
          provider: actualComposition.settings.provider,
          resultCount: 0,
          results: [],
        },
      });

      try {
        const result = await actualComposition.searchWeb.search(
          {
            query: parsed.value.query,
            maxResults: parsed.value.maxResults,
            depth: parsed.value.depth,
          },
          { signal: composed.signal },
        );
        if (result._tag === "err") {
          throw toWebSearchBoundaryError(
            result.error,
            parsed.value.timeoutSeconds,
            signal,
            composed.signal,
          );
        }

        const projected = await projectSearchWebResultToPiToolResult(
          result.value,
          actualComposition.outputStore,
        );
        if (projected._tag === "err") {
          throw toWebSearchBoundaryError(
            projected.error,
            parsed.value.timeoutSeconds,
            signal,
            composed.signal,
          );
        }

        return projected.value;
      } finally {
        composed.cleanup();
      }
    },
    renderCall,
    renderResult,
  };
}
