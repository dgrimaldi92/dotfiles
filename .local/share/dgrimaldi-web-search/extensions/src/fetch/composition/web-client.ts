import {
  isOperationTimeoutError,
  isPrivateOrLocalIp,
  isRedirectStatus,
  readBodyWithLimit,
  stripIpv6Brackets,
} from "../../shared/network";
import { err, ok, Result } from "../../shared/result";
import { PublicWebError } from "../api/errors";
import { PublicWebRequest, PublicWebResponse } from "../domain/types";
import {
  parsePublicHttpUrl,
  ParsePublicHttpUrlError,
  PublicHttpUrl,
} from "../../shared/url-parser";
import { lookup } from "node:dns/promises";

export type FetchPublicWebClient = ReturnType<typeof createFetchPublicWebClient>;

export interface PublicWebClient {
  get(
    request: PublicWebRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Result<PublicWebResponse, PublicWebError>>;
}

async function fetchWithUserAgent(
  request: PublicWebRequest,
  userAgent: string,
  signal?: AbortSignal,
): Promise<
  Result<{ readonly response: Response; readonly finalUrl: PublicHttpUrl }, PublicWebError>
> {
  let currentUrl = new URL(request.url);
  let redirects = 0;

  while (true) {
    if (signal?.aborted) {
      return err(classifySignalAbort(signal));
    }

    const currentPublicUrl = publicHttpUrlFromUrl(currentUrl);
    if (currentPublicUrl._tag === "err") {
      return currentPublicUrl;
    }

    if (request.blockPrivateHosts) {
      const publicCheck = await checkPublicUrl(currentUrl, currentPublicUrl.value);
      if (publicCheck._tag === "err") {
        return publicCheck;
      }
    }

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: request.accept,
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal,
        redirect: "manual",
      });
    } catch (cause: unknown) {
      if (signal?.aborted || (cause instanceof Error && cause.name === "AbortError")) {
        return err(
          signal ? classifySignalAbort(signal, cause) : { _tag: "PublicWebCancelled", cause },
        );
      }
      return err({ _tag: "PublicWebRequestFailed", cause });
    }

    if (!isRedirectStatus(response.status)) {
      return ok({ response, finalUrl: currentPublicUrl.value });
    }

    await response.body?.cancel().catch(() => undefined);
    const location = response.headers.get("location");
    if (!location) {
      return err({ _tag: "RedirectLocationMissing", url: currentPublicUrl.value });
    }
    if (redirects >= request.maxRedirects) {
      return err({
        _tag: "RedirectLimitExceeded",
        url: request.url,
        maxRedirects: request.maxRedirects,
      });
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      return err({ _tag: "RedirectLocationInvalid" });
    }
    if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
      return err({ _tag: "RedirectProtocolUnsupported", protocol: nextUrl.protocol });
    }

    currentUrl = nextUrl;
    redirects += 1;
  }
}

export function createFetchPublicWebClient(): PublicWebClient {
  return {
    /** Fetch a bounded public web response, following safe redirects. */
    get: async function (
      request: PublicWebRequest,
      options: { readonly signal?: AbortSignal } = {},
    ): Promise<Result<PublicWebResponse, PublicWebError>> {
      const firstFetch = await fetchWithUserAgent(request, request.userAgent, options.signal);
      if (firstFetch._tag === "err") {
        return firstFetch;
      }

      let response = firstFetch.value.response;
      let finalUrl = firstFetch.value.finalUrl;
      if (response.status === 403 && response.headers.get("cf-mitigated") === "challenge") {
        await response.body?.cancel().catch(() => undefined);
        const retryFetch = await fetchWithUserAgent(
          request,
          request.fallbackUserAgent,
          options.signal,
        );
        if (retryFetch._tag === "err") {
          return retryFetch;
        }
        response = retryFetch.value.response;
        finalUrl = retryFetch.value.finalUrl;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return err({
          _tag: "HttpStatusRejected",
          status: response.status,
          statusText: response.statusText,
        });
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        const declaredBytes = Number.parseInt(contentLength, 10);
        if (Number.isFinite(declaredBytes) && declaredBytes > request.maxResponseBytes) {
          await response.body?.cancel().catch(() => undefined);
          return err({ _tag: "ResponseTooLarge", maxBytes: request.maxResponseBytes });
        }
      }

      try {
        const body = await readBodyWithLimit(response, request.maxResponseBytes, options.signal);
        return ok({
          requestedUrl: request.url,
          finalUrl,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: body.buffer,
          bytes: body.bytes,
        });
      } catch (cause: unknown) {
        if (options.signal?.aborted) {
          return err(classifySignalAbort(options.signal, cause));
        }
        if (cause instanceof Error && cause.message.startsWith("Response too large")) {
          return err({ _tag: "ResponseTooLarge", maxBytes: request.maxResponseBytes });
        }
        return err({ _tag: "PublicWebRequestFailed", cause });
      }
    },
  };
}

function classifySignalAbort(signal: AbortSignal, cause?: unknown): PublicWebError {
  if (isOperationTimeoutError(signal.reason)) {
    return { _tag: "PublicWebTimedOut", timeoutSeconds: signal.reason.timeoutSeconds };
  }
  return { _tag: "PublicWebCancelled", cause };
}
function publicHttpUrlFromUrl(url: URL): Result<PublicHttpUrl, PublicWebError> {
  const parsed = parsePublicHttpUrl(url.toString());
  if (parsed._tag === "err") {
    return err(mapPublicHttpUrlParseError(parsed.error));
  }
  return parsed;
}
function mapPublicHttpUrlParseError(error: ParsePublicHttpUrlError): PublicWebError {
  switch (error._tag) {
    case "UrlCredentialsUnsupported":
      return { _tag: "UrlCredentialsUnsupported", url: error.url };
    case "UnsupportedUrlProtocol":
      return { _tag: "RedirectProtocolUnsupported", protocol: error.protocol ?? "unknown" };
    case "EmptyUrl":
    case "InvalidUrl":
      return { _tag: "PublicWebRequestFailed", cause: error };
  }
}

async function checkPublicUrl(
  url: URL,
  publicUrl: PublicHttpUrl,
): Promise<Result<void, PublicWebError>> {
  const hostname = stripIpv6Brackets(url.hostname).toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return err({ _tag: "PrivateHostBlocked", url: publicUrl });
  }
  if (isPrivateOrLocalIp(hostname)) {
    return err({ _tag: "PrivateIpBlocked", url: publicUrl });
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    for (const record of records) {
      if (isPrivateOrLocalIp(record.address)) {
        return err({ _tag: "PrivateIpBlocked", url: publicUrl });
      }
    }
  } catch {
    // If DNS resolution fails, let fetch surface the connectivity failure.
  }

  return ok(undefined);
}
