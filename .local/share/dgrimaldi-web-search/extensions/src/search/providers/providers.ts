import {
  NormalizedSearchResult,
  SearchDepth,
  SearchProviderName,
  SearchQuery,
} from "@/search/domain/types";
import { err, ok, Result } from "@/shared/result";
import { parseContentType, PublicHttpUrl } from "@/shared/url-parser";
import { isAbortError } from "@/search/domain/error";
import { decodeTextBuffer, readBodyWithLimit } from "@/shared/network";

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

export const MAX_SEARCH_RESPONSE_BYTES = 1 * 1024 * 1024;

export interface HttpJsonRequest {
  readonly url: PublicHttpUrl;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly maxResponseBytes: number;
}

export interface HttpTextResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly bodyText: string;
  readonly bytes: number;
}

export type HttpClientError =
  | { readonly _tag: "HttpRequestFailed"; readonly cause: unknown }
  | { readonly _tag: "HttpResponseTooLarge"; readonly maxBytes: number }
  | { readonly _tag: "HttpCancelled"; readonly cause?: unknown };

export interface HttpTextClient {
  postJson(
    request: HttpJsonRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Result<HttpTextResponse, HttpClientError>>;
}

export class FetchHttpTextClient implements HttpTextClient {
  /** Post a JSON request and return bounded response text. */
  async postJson(
    request: HttpJsonRequest,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<Result<HttpTextResponse, HttpClientError>> {
    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: options.signal,
      });

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        const declaredBytes = Number.parseInt(contentLength, 10);
        if (Number.isFinite(declaredBytes) && declaredBytes > request.maxResponseBytes) {
          await response.body?.cancel().catch(() => undefined);
          return err({ _tag: "HttpResponseTooLarge", maxBytes: request.maxResponseBytes });
        }
      }

      const parsedContentType = parseContentType(response.headers.get("content-type"));
      const body = await readBodyWithLimit(response, request.maxResponseBytes, options.signal);
      const decoded = decodeTextBuffer(body.buffer, parsedContentType.charset);

      return ok({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        bodyText: decoded.text,
        bytes: body.bytes,
      });
    } catch (cause: unknown) {
      if (options.signal?.aborted || isAbortError(cause)) {
        return err({ _tag: "HttpCancelled", cause });
      }
      if (cause instanceof Error && cause.message.startsWith("Response too large")) {
        return err({ _tag: "HttpResponseTooLarge", maxBytes: request.maxResponseBytes });
      }
      return err({ _tag: "HttpRequestFailed", cause });
    }
  }
}
