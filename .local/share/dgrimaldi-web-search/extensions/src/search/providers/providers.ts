import {
  NormalizedSearchResult,
  SearchDepth,
  SearchProviderName,
  SearchQuery,
  WebToolsSettings,
} from "@/search/domain/types";
import { Result } from "@/shared/result";

export interface SearchProviderRequest {
  readonly query: SearchQuery;
  readonly maxResults: number;
  readonly depth: SearchDepth;
}

export type SearchProviderError =
  | {
      readonly _tag: "SearchProviderUnavailable";
      readonly provider: SearchProviderName;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "SearchProviderStatusRejected";
      readonly provider: SearchProviderName;
      readonly status: number;
    }
  | {
      readonly _tag: "SearchProviderResponseTooLarge";
      readonly provider: SearchProviderName;
      readonly maxBytes: number;
    }
  | {
      readonly _tag: "SearchProviderProtocolInvalid";
      readonly provider: SearchProviderName;
      readonly reason: string;
    }
  | {
      readonly _tag: "SearchProviderReturnedError";
      readonly provider: SearchProviderName;
      readonly safeMessage: string;
    }
  | { readonly _tag: "SearchProviderNoRecognizedResults"; readonly provider: SearchProviderName }
  | {
      readonly _tag: "SearchProviderCancelled";
      readonly provider: SearchProviderName;
      readonly cause?: unknown;
    }
  | { readonly _tag: "SearchTimedOut"; readonly afterSeconds: number };

export type SearchRequest = SearchProviderRequest;

export type SearchSites = (
  input: SearchProviderRequest,
  options?: { readonly signal?: AbortSignal },
) => Promise<Result<readonly NormalizedSearchResult[], SearchProviderError>>;

export type SearchProvider = {
  readonly name: SearchProviderName;
  readonly search: SearchSites;
};

export function createSearchProvider(settings: WebToolsSettings["search"]): SearchProvider {
  switch (settings.provider) {
    case "exa":
      return new ExaSearchProvider(settings.endpoint, new FetchHttpTextClient());
    // case "parallel":
    //   return new ParallelSearchProvider(settings.endpoint, new FetchHttpTextClient());
  }
}
