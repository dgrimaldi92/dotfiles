import { decodeTextBuffer } from "../../shared/network.js";
import { parseContentType, PublicHttpUrl } from "../../shared/url-parser.js";
import { err, ok, type Result } from "../../shared/result.js";
import { FetchPageError, PublicWebError } from "../api/errors.js";
import { PublicWebRequest, PublicWebResponse, WebFetchFormat } from "../domain/types.js";
import { htmlToMarkdown } from "./html.js";
import { WebToolsSettings } from "../../shared/web-tools.js";
import { PublicWebClient } from "./web-client.js";

export const OPENCODE_WEBFETCH_DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
export const OPENCODE_WEBFETCH_FALLBACK_USER_AGENT = "opencode";

export interface FetchPageInput {
  readonly url: PublicHttpUrl;
  readonly format: WebFetchFormat;
}

export type FetchPageResult =
  | {
      readonly _tag: "Text";
      readonly requestedUrl: PublicHttpUrl;
      readonly finalUrl: PublicHttpUrl;
      readonly format: WebFetchFormat;
      readonly status: number;
      readonly mime: string;
      readonly contentType: string;
      readonly charset?: string;
      readonly decoder: string;
      readonly bytes: number;
      readonly text: string;
    }
  | {
      readonly _tag: "Image";
      readonly requestedUrl: PublicHttpUrl;
      readonly finalUrl: PublicHttpUrl;
      readonly format: WebFetchFormat;
      readonly status: number;
      readonly mime: string;
      readonly contentType: string;
      readonly bytes: number;
      readonly data: Buffer;
    };

export interface FetchPageDependencies {
  readonly publicWeb: PublicWebClient;
  readonly settings: WebToolsSettings["fetch"];
}

export type FetchPage = ReturnType<typeof createWebFetch>;

function getAcceptHeader(format: WebFetchFormat): string {
  switch (format) {
    case "markdown":
      return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, application/xhtml+xml;q=0.6, */*;q=0.1";
    case "text":
      return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, application/xhtml+xml;q=0.7, */*;q=0.1";
    case "html":
      return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
  }
}

export function createWebFetch(dependencies: FetchPageDependencies) {
  return {
    fetch: async function (
      input: FetchPageInput,
      options: { readonly signal?: AbortSignal } = {},
    ): Promise<Result<FetchPageResult, FetchPageError>> {
      const response = await dependencies.publicWeb.get(
        {
          url: input.url,
          accept: getAcceptHeader(input.format),
          userAgent: OPENCODE_WEBFETCH_DEFAULT_USER_AGENT,
          fallbackUserAgent: getFallbackUserAgent(dependencies.settings.fallbackUserAgent),
          maxRedirects: dependencies.settings.maxRedirects,
          maxResponseBytes: dependencies.settings.maxResponseBytes,
          blockPrivateHosts: dependencies.settings.blockPrivateHosts,
        },
        { signal: options.signal },
      );
      if (response._tag === "err") {
        return response;
      }

      const parsedContentType = parseContentType(response.value.headers.get("content-type"));
      if (parsedContentType.kind === "raster-image") {
        return ok({
          _tag: "Image",
          requestedUrl: response.value.requestedUrl,
          finalUrl: response.value.finalUrl,
          format: input.format,
          status: response.value.status,
          mime: parsedContentType.mime,
          contentType: parsedContentType.contentType,
          bytes: response.value.bytes,
          data: response.value.body,
        });
      }

      if (parsedContentType.kind === "binary") {
        if (parsedContentType.mime) {
          return err({ _tag: "UnsupportedBinaryContent", mime: parsedContentType.mime });
        }
        return err({ _tag: "UnsupportedBinaryContent" });
      }

      const decoded = decodeTextBuffer(response.value.body, parsedContentType.charset);
      const converted = await convertText(
        decoded.text,
        response.value.finalUrl,
        parsedContentType.kind,
        input.format,
      );
      if (converted._tag === "err") {
        return converted;
      }

      return ok({
        _tag: "Text",
        requestedUrl: response.value.requestedUrl,
        finalUrl: response.value.finalUrl,
        format: input.format,
        status: response.value.status,
        mime: parsedContentType.mime,
        contentType: parsedContentType.contentType,
        charset: parsedContentType.charset,
        decoder: decoded.decoder,
        bytes: response.value.bytes,
        text: converted.value,
      });
    },
  };
}

/** Build legacy webfetch request headers for tests and UI-adjacent callers. */
export function createWebFetchHeaders(
  accept: string,
  userAgent = OPENCODE_WEBFETCH_DEFAULT_USER_AGENT,
): Record<string, string> {
  return {
    "User-Agent": userAgent,
    Accept: accept,
    "Accept-Language": "en-US,en;q=0.9",
  };
}

/** Return the configured fallback user agent or the web-tools default. */
export function getFallbackUserAgent(configuredUserAgent?: string): string {
  const trimmed = configuredUserAgent?.trim();
  return trimmed || OPENCODE_WEBFETCH_FALLBACK_USER_AGENT;
}

/** Detect the Cloudflare challenge response that webfetch retries with a fallback user agent. */
export function shouldRetryWithFallbackUserAgent(
  response: Pick<Response, "status" | "headers">,
): boolean {
  return response.status === 403 && response.headers.get("cf-mitigated") === "challenge";
}

async function convertText(
  text: string,
  baseUrl: PublicHttpUrl,
  kind: "html" | "text" | "svg",
  format: WebFetchFormat,
): Promise<Result<string, FetchPageError>> {
  try {
    if (kind === "html" && format === "markdown") {
      const markdown = await htmlToMarkdown(text, baseUrl);
      return ok(markdown);
    }
    return ok(text);
  } catch (cause: unknown) {
    return err({ _tag: "HtmlConversionFailed", cause });
  }
}
