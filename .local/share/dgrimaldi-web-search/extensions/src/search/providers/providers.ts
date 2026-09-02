import {
  NormalizedSearchResult,
  SearchDepth,
  SearchProviderName,
  SearchQuery,
} from "@/search/domain/types";
import { HttpClientError } from "@/shared/http-parser";
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

export interface SearchProvider {
  readonly name: SearchProviderName;

  search(
    input: SearchProviderRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Result<readonly NormalizedSearchResult[], SearchProviderError>>;
}
export function mapHttpClientError(error: HttpClientError): SearchProviderError {
  switch (error._tag) {
    case "HttpRequestFailed":
      return { _tag: "SearchProviderUnavailable", provider: "exa", cause: error.cause };
    case "HttpResponseTooLarge":
      return { _tag: "SearchProviderResponseTooLarge", provider: "exa", maxBytes: error.maxBytes };
    case "HttpCancelled":
      return { _tag: "SearchProviderCancelled", provider: "exa", cause: error.cause };
  }
}
