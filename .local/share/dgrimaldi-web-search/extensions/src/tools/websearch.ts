import { StringEnum } from "@earendil-works/pi-ai";
import Type from "typebox";

export interface WebSearchToolComposition {
  readonly settings: WebToolsSettings["search"];
  readonly searchWeb: SearchWeb;
  readonly outputStore: ToolOutputStore;
}

type WebSearchBoundaryError =
  | ToolInputParseError
  | ParseSearchQueryError
  | SearchWebError
  | ToolOutputStoreError;

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

    renderCall(
      args: { query: string; depth?: SearchDepth; maxResults?: number },
      theme: RenderTheme,
    ) {
      let text = theme.fg("toolTitle", theme.bold("websearch "));
      text += theme.fg("accent", JSON.stringify(String(args.query)));
      if (args.depth && args.depth !== "auto") {
        text += theme.fg("muted", ` (${args.depth})`);
      }
      if (args.maxResults) {
        text += theme.fg("dim", ` limit=${args.maxResults}`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(
      result: {
        content: Array<{ type: string; text?: string }>;
        details?: WebSearchDetails;
        isError?: boolean;
      },
      options: { expanded: boolean; isPartial: boolean },
      theme: RenderTheme,
    ) {},
  };
}
