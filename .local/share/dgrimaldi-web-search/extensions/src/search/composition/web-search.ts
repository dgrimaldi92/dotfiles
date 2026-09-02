import { err, ok, type Result } from "@/shared/result.js";
import type {
  NormalizedSearchResult,
  SearchDepth,
  SearchProviderName,
  SearchQuery,
  WebToolsSettings,
} from "@/search/domain/types.js";
import { SearchProvider, SearchProviderError } from "@/search/providers/providers";

interface SearchWebInput {
  readonly query: SearchQuery;
  readonly maxResults: number;
  readonly depth: SearchDepth;
}

interface SearchWebResult {
  readonly query: SearchQuery;
  readonly depth: SearchDepth;
  readonly maxResults: number;
  readonly provider: SearchProviderName;
  readonly results: readonly NormalizedSearchResult[];
}

export type SearchWebError = { readonly _tag: "SearchDisabled" } | SearchProviderError;

export interface SearchWebDependencies {
  readonly provider: SearchProvider;
  readonly settings: WebToolsSettings["search"];
}

export type SearchWeb = ReturnType<typeof createSearchWeb>;

export function createSearchWeb(dependencies: SearchWebDependencies) {
  return {
    search: async function (
      input: SearchWebInput,
      options: { readonly signal?: AbortSignal } = {},
    ): Promise<Result<SearchWebResult, SearchWebError>> {
      if (!dependencies.settings.enabled) {
        return err({ _tag: "SearchDisabled" });
      }

      const providerResult = await dependencies.provider.search(input, {
        signal: options.signal,
      });
      if (providerResult._tag === "err") {
        return providerResult;
      }

      return ok({
        query: input.query,
        depth: input.depth,
        maxResults: input.maxResults,
        provider: dependencies.provider.name,
        results: providerResult.value,
      });
    },
  };
}
