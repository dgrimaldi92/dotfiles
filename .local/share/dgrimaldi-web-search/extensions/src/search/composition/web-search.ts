import { err, ok, type Result } from "@/shared/result.js";
import type {
  NormalizedSearchResult,
  SearchDepth,
  SearchProviderName,
  SearchQuery,
} from "@/search/domain/types.js";

export interface SearchWebInput {
  readonly query: SearchQuery;
  readonly maxResults: number;
  readonly depth: SearchDepth;
}

export interface SearchWebResult {
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

/** Execute a web search through the configured provider. */
export type SearchWeb = (
  input: SearchWebInput,
  options?: { readonly signal?: AbortSignal },
) => Promise<Result<SearchWebResult, SearchWebError>>;

export const createSearchWeb =
  ({ provider, settings }: SearchWebDependencies): SearchWeb =>
  async (input, options = {}) => {
    if (!settings.enabled) {
      return err({ _tag: "SearchDisabled" });
    }

    const providerResult = await provider.search(input, { signal: options.signal });
    if (providerResult._tag === "err") {
      return providerResult;
    }

    return ok({
      query: input.query,
      depth: input.depth,
      maxResults: input.maxResults,
      provider: provider.name,
      results: providerResult.value,
    });
  };
