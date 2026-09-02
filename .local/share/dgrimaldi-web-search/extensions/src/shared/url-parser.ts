import { Redacted, type Redacted as RedactedValue } from "./redacted";
import { err, ok, Result } from "./result";

export type PublicHttpUrl = string & { readonly __brand: "PublicHttpUrl" };

export type ParsePublicHttpUrlError =
  | { readonly _tag: "EmptyUrl" }
  | { readonly _tag: "UnsupportedUrlProtocol"; readonly protocol?: string }
  | { readonly _tag: "InvalidUrl"; readonly input: RedactedValue<string> }
  | { readonly _tag: "UrlCredentialsUnsupported"; readonly url: RedactedValue<string> };

export type ContentKind = "html" | "text" | "raster-image" | "svg" | "binary";
export interface ParsedContentType {
  readonly contentType: string;
  readonly mime: string;
  readonly charset?: string;
  readonly kind: ContentKind;
}

/** Parse and normalize a public HTTP(S) URL from boundary input. */
export function parsePublicHttpUrl(input: string): Result<PublicHttpUrl, ParsePublicHttpUrlError> {
  const trimmed = input.trim();
  if (!trimmed) {
    return err({ _tag: "EmptyUrl" });
  }

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  const protocol = schemeMatch?.[1]?.toLowerCase();
  const normalized = trimmed.toLowerCase();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    if (protocol) {
      return err({ _tag: "UnsupportedUrlProtocol", protocol: `${protocol}:` });
    }
    return err({ _tag: "UnsupportedUrlProtocol" });
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return err({ _tag: "InvalidUrl", input: Redacted.make(trimmed) });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return err({ _tag: "UnsupportedUrlProtocol", protocol: url.protocol });
  }

  if (url.username || url.password) {
    return err({ _tag: "UrlCredentialsUnsupported", url: Redacted.make(url.toString()) });
  }

  // SAFETY: URL parsing succeeded, credentials are absent, and the protocol is restricted to public HTTP(S).
  return ok(url.toString() as PublicHttpUrl);
}

/** Parse and normalize html content. */
const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/rss+xml",
  "application/atom+xml",
  "application/javascript",
  "application/x-javascript",
  "application/ecmascript",
  "image/svg+xml",
]);
const RASTER_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export function parseContentType(contentTypeHeader: string | null | undefined): ParsedContentType {
  const contentType = contentTypeHeader?.trim() ?? "";
  const [mimePart = ""] = contentType.split(";");
  const mime = mimePart.trim().toLowerCase();
  const charsetMatch = contentType.match(/charset\s*=\s*['\"]?([^;'\"]+)/i);
  const charset = charsetMatch?.[1]?.trim().toLowerCase();
  return {
    contentType,
    mime,
    charset,
    kind: classifyMimeType(mime),
  };
}

export function classifyMimeType(mime: string): ContentKind {
  const normalized = mime.trim().toLowerCase();
  if (!normalized) return "binary";
  if (HTML_MIME_TYPES.has(normalized)) return "html";
  if (RASTER_IMAGE_MIME_TYPES.has(normalized)) return "raster-image";
  if (normalized === "image/svg+xml") return "svg";
  if (normalized.startsWith("text/")) return normalized === "text/html" ? "html" : "text";
  if (
    TEXT_MIME_TYPES.has(normalized) ||
    normalized.endsWith("+xml") ||
    normalized.endsWith("+json")
  )
    return "text";
  return "binary";
}
