import { DEFAULTS } from "../../shared/config";
import { WebFetchFormat, WebToolsSettings } from "../../shared/web-tools";

export const WEB_FETCH_FORMATS = [
  "markdown",
  // "text",
  // "html",
] as const satisfies readonly WebFetchFormat[];

/** Return web fetch settings that do not depend on search provider configuration. */
export function getWebFetchSettings(): WebToolsSettings["fetch"] {
  return {
    defaultFormat: DEFAULTS.fetchDefaultFormat,
    timeoutSeconds: DEFAULTS.fetchTimeoutSeconds,
    maxResponseBytes: DEFAULTS.fetchMaxResponseBytes,
    blockPrivateHosts: DEFAULTS.fetchBlockPrivateHosts,
    maxRedirects: DEFAULTS.fetchMaxRedirects,
    fallbackUserAgent: DEFAULTS.fetchFallbackUserAgent,
  };
}
