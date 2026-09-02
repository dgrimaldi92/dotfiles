import { StringEnum } from "@earendil-works/pi-ai";
import Type from "typebox";
import { renderCall, renderResult } from "@/search/presentation/tui";
import type { WebSearchDetails, WebToolsSettings } from "@/search/domain/types";
import { getWebSearchSettings, SEARCH_DEPTHS } from "@/search/domain/config";
import {
  projectSearchWebResultToPiToolResult,
  TempFileToolOutputStore,
  textContent,
  type ToolOutputStore,
} from "@/search/presentation/agent-view";
import { createSearchWeb, type SearchWeb } from "@/search/composition/web-search";
import { toWebSearchBoundaryError, toWebSearchToolError } from "@/search/domain/error";
import { SearchProvider } from "@/search/providers/providers";
import { parseWebSearchToolParams } from "@/search/presentation/input";
import { PiToolResult } from "@/search/presentation/utils";
import { createOperationSignal } from "@/shared/network";

export interface WebSearchToolComposition {
  readonly settings: WebToolsSettings["search"];
  readonly searchWeb: SearchWeb;
  readonly outputStore: ToolOutputStore;
}

export function createSearchProvider(settings: WebToolsSettings["search"]): SearchProvider {
  switch (settings.provider) {
    case "exa":
      return new ExaSearchProvider(settings.endpoint, new FetchHttpTextClient());
    // case "parallel":
    //   return new ParallelSearchProvider(settings.endpoint, new FetchHttpTextClient());
  }
}

function createDefaultWebSearchComposition(): WebSearchToolComposition {
  const settings = getWebSearchSettings();
  const provider = createSearchProvider(settings);
  return {
    settings,
    searchWeb: createSearchWeb({ provider, settings }),
    outputStore: new TempFileToolOutputStore(),
  };
}

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
