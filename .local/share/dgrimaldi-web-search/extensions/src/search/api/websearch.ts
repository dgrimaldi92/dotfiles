import { StringEnum } from "@earendil-works/pi-ai";
import Type from "typebox";
import { renderCall, renderResult } from "../presentation/tui";
import type { WebSearchDetails, WebToolsSettings } from "../domain/types";
import { getWebSearchSettings, SEARCH_DEPTHS, SEARCH_PROVIDERS } from "../domain/config";
import {
  projectSearchWebResultToPiToolResult,
  textContent,
  writeTempFile,
  type ToolOutputStore,
} from "../presentation/agent-view";
import { createSearchWeb, SearchWeb } from "../composition/web-search";
import { SearchProvider } from "../providers/providers";
import { parseWebSearchToolParams } from "../presentation/input";
import { PiToolResult } from "../presentation/utils";
import { createOperationSignal } from "../../shared/network";
import { createExaSearchProvider } from "../providers/exa";
import { fetchHttpTextClient } from "../../shared/http-parser";
import { toWebSearchBoundaryError, toWebSearchToolError } from "./errors";
import { logger } from "../../shared/logger";
import { createTavilySearchProvider } from "../providers/tavily";

export interface WebSearchToolComposition {
  readonly settings: WebToolsSettings["search"];
  readonly searchWeb: SearchWeb;
  readonly outputStore: ToolOutputStore;
}

export function createSearchProvider(settings: WebToolsSettings["search"]): SearchProvider {
  switch (settings.provider) {
    case "exa":
      return createExaSearchProvider({
        endpoint: settings.endpoint,
        http: fetchHttpTextClient(),
      });
    case "tavily":
      return createTavilySearchProvider({
        endpoint: settings.endpoint,
        http: fetchHttpTextClient(),
      });

    // settings.endpoint, new FetchHttpTextClient());
    // case "parallel":
    //   return new ParallelSearchProvider(settings.endpoint, new FetchHttpTextClient());
  }
}

function createDefaultWebSearchComposition(params: unknown): WebSearchToolComposition {
  const providerName = params["provider"] as (typeof SEARCH_PROVIDERS)[number];
  const settings = getWebSearchSettings(providerName);
  const provider = createSearchProvider(settings);
  return {
    settings,
    searchWeb: createSearchWeb({ provider, settings }),
    outputStore: writeTempFile(),
  };
}

export function createWebSearchTool() {
  //composition?: WebSearchToolComposition
  // const actualComposition = createDefaultWebSearchComposition();
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
      provider: StringEnum([...SEARCH_PROVIDERS], {
        description:
          "tavily = definite-answer lookups (facts, news, docs, prices, known pages); returns full page text. exa = semantic discovery ('find things like this') and entities (people, companies, repos, papers). Retry with exa if tavily results are weak",
      }),
    }),

    async execute(
      _toolCallId: string,
      params: unknown,
      signal: AbortSignal,
      onUpdate: (update: PiToolResult<WebSearchDetails>) => void,
    ) {
      const actualComposition = createDefaultWebSearchComposition(params);
      const parsed = parseWebSearchToolParams(params, actualComposition.settings);
      if (parsed._tag === "err") {
        throw toWebSearchToolError(parsed.error);
      }

      const composed = createOperationSignal(parsed.value.timeoutSeconds * 1000, signal);
      onUpdate({
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

        logger.info({
          content: [textContent(`Searching for ${JSON.stringify(parsed.value.query)}...`)],
          details: {
            query: parsed.value.query,
            depth: parsed.value.depth,
            maxResults: parsed.value.maxResults,
            provider: actualComposition.settings.provider,
            resultCount: 0,
            result,
          },
        });
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
