import { PublicHttpUrl } from "@/search/domain/types";
import { err } from "./result";

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
