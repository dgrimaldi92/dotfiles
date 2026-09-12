import { Redacted } from "../../shared/redacted";
import { PublicHttpUrl } from "../../shared/url-parser";

export const WEB_TOOLS_EXTENSION_NAME = "web-tools";

/** A non-empty, trimmed search query. */
export type SearchQuery = string & { readonly __brand: "SearchQuery" };

export type WebFetchFormat = "markdown" | "text" | "html";

export interface WebFetchDetails {
  readonly requestedUrl: string;
  readonly finalUrl: string;
  readonly format: WebFetchFormat;
  readonly status: number;
  readonly mime: string;
  readonly contentType: string;
  readonly charset?: string;
  readonly decoder?: string;
  readonly bytes: number;
  readonly image?: boolean;
  readonly truncated?: boolean;
  readonly fullOutputPath?: string;
}

export interface PublicWebRequest {
  readonly url: PublicHttpUrl;
  readonly accept: string;
  readonly userAgent: string;
  readonly fallbackUserAgent: string;
  readonly maxRedirects: number;
  readonly maxResponseBytes: number;
  readonly blockPrivateHosts: boolean;
}

export interface PublicWebResponse {
  readonly requestedUrl: PublicHttpUrl;
  readonly finalUrl: PublicHttpUrl;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: Buffer;
  readonly bytes: number;
}

/** Format URL-like UI text without exposing URL userinfo credentials. */
export function redactUrlCredentialsForDisplay(input: unknown): string {
  const raw = String(input);
  const trimmed = raw.trim();
  if (!trimmed) {
    return raw;
  }

  try {
    const url = new URL(trimmed);
    if (url.username || url.password) {
      return String(Redacted.make(trimmed));
    }
    return url.toString();
  } catch {
    return looksLikeCredentialedAbsoluteUrl(trimmed) ? String(Redacted.make(trimmed)) : raw;
  }
}

function looksLikeCredentialedAbsoluteUrl(input: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]*@/i.test(input);
}
