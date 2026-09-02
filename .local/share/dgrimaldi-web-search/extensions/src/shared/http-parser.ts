import { decodeTextBuffer, readBodyWithLimit } from "./network";
import { err, ok, Result } from "./result";
import { parseContentType, PublicHttpUrl } from "./url-parser";

export const MAX_SEARCH_RESPONSE_BYTES = 1 * 1024 * 1024;

interface HttpJsonRequest {
  readonly url: PublicHttpUrl;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly maxResponseBytes: number;
}

interface HttpTextResponse {
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

export function fetchHttpTextClient(): HttpTextClient {
  return {
    postJson: async function (
      request: HttpJsonRequest,
      options?: { readonly signal?: AbortSignal },
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
        if (options.signal?.aborted || (cause instanceof Error && cause.name === "AbortError")) {
          return err({ _tag: "HttpCancelled", cause });
        }
        if (cause instanceof Error && cause.message.startsWith("Response too large")) {
          return err({ _tag: "HttpResponseTooLarge", maxBytes: request.maxResponseBytes });
        }
        return err({ _tag: "HttpRequestFailed", cause });
      }
    },
  };
}
