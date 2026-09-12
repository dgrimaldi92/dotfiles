import { isOperationTimeoutError } from "../../shared/network";
import {
  ParsePublicHttpUrlError,
  ToolInputParseError,
  ToolOutputStoreError,
} from "../../shared/errors";
import { Redacted } from "../../shared/redacted";
import { PublicHttpUrl } from "../../shared/url-parser";

export type PublicWebError =
  | { readonly _tag: "PublicWebRequestFailed"; readonly cause: unknown }
  | { readonly _tag: "PublicWebCancelled"; readonly cause?: unknown }
  | { readonly _tag: "PublicWebTimedOut"; readonly timeoutSeconds: number }
  | { readonly _tag: "UrlCredentialsUnsupported"; readonly url: Redacted<string> }
  | { readonly _tag: "PrivateHostBlocked"; readonly url: PublicHttpUrl }
  | { readonly _tag: "PrivateIpBlocked"; readonly url: PublicHttpUrl }
  | { readonly _tag: "RedirectLocationMissing"; readonly url: PublicHttpUrl }
  | { readonly _tag: "RedirectLocationInvalid" }
  | {
      readonly _tag: "RedirectLimitExceeded";
      readonly url: PublicHttpUrl;
      readonly maxRedirects: number;
    }
  | { readonly _tag: "RedirectProtocolUnsupported"; readonly protocol: string }
  | { readonly _tag: "HttpStatusRejected"; readonly status: number; readonly statusText: string }
  | { readonly _tag: "ResponseTooLarge"; readonly maxBytes: number };

export type FetchPageError =
  | PublicWebError
  | { readonly _tag: "UnsupportedBinaryContent"; readonly mime?: string }
  | { readonly _tag: "HtmlConversionFailed"; readonly cause: unknown };

type WebFetchBoundaryError =
  | ToolInputParseError
  | ParsePublicHttpUrlError
  | FetchPageError
  | ToolOutputStoreError;

export function toWebFetchToolError(error: WebFetchBoundaryError): Error {
  return new Error(renderSafeWebFetchError(error));
}
export function toWebFetchBoundaryError(
  error: WebFetchBoundaryError,
  timeoutSeconds: number,
  outerSignal: AbortSignal | undefined,
  operationSignal: AbortSignal,
): Error {
  if (outerSignal?.aborted) {
    return new Error("Web fetch cancelled");
  }
  if (isOperationTimeoutError(operationSignal.reason)) {
    return new Error(`Web fetch timed out after ${timeoutSeconds}s`);
  }
  return toWebFetchToolError(error);
}

export function renderSafeWebFetchError(error: WebFetchBoundaryError): string {
  switch (error._tag) {
    case "InvalidToolInput":
      return error.message;
    case "InvalidToolField":
      return `${error.field}: ${error.message}`;
    case "UnknownToolField":
      return `Unknown webfetch field: ${error.field}`;
    case "EmptyUrl":
      return "URL cannot be empty";
    case "UnsupportedUrlProtocol":
      return "URL must start with http:// or https://";
    case "InvalidUrl":
      return "Invalid URL";
    case "UrlCredentialsUnsupported":
      return "URL credentials are not supported";
    case "PublicWebRequestFailed":
      return "Request failed";
    case "PublicWebCancelled":
      return "Web fetch cancelled";
    case "PublicWebTimedOut":
      return `Web fetch timed out after ${error.timeoutSeconds}s`;
    case "PrivateHostBlocked":
      return "Blocked private or local host";
    case "PrivateIpBlocked":
      return "Blocked private or local IP address";
    case "RedirectLocationMissing":
      return "Redirect response was missing a Location header";
    case "RedirectLocationInvalid":
      return "Redirect response had an invalid Location header";
    case "RedirectLimitExceeded":
      return "Too many redirects while fetching URL";
    case "RedirectProtocolUnsupported":
      return "Redirected to unsupported protocol";
    case "HttpStatusRejected":
      return `Request failed (${error.status} ${error.statusText || ""})`.trim();
    case "ResponseTooLarge":
      return `Response too large (${Math.floor(error.maxBytes / (1024 * 1024))}MB limit)`;
    case "UnsupportedBinaryContent":
      return `Unsupported binary content${error.mime ? ` (${error.mime})` : ""}. Try a more text-oriented URL.`;
    case "HtmlConversionFailed":
      return "HTML conversion failed";
    case "TempFileWriteFailed":
      return "Failed to write full webfetch output";
  }
}
