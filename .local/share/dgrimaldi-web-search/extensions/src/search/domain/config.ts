import { PublicHttpUrl, parsePublicHttpUrl } from "@/shared/url-parser";
import type { SearchDepth, SearchProviderName, WebFetchFormat, WebToolsSettings } from "./types";

export const WEB_FETCH_FORMATS = [
  "markdown",
  "text",
  "html",
] as const satisfies readonly WebFetchFormat[];
export const SEARCH_DEPTHS = ["auto", "fast", "deep"] as const satisfies readonly SearchDepth[];
export const SEARCH_PROVIDERS = [
  "exa",
  "parallel",
] as const satisfies readonly SearchProviderName[];

export const FETCH_TIMEOUT_SECONDS = {
  default: 30,
  min: 1,
  max: 120,
} as const;

export const SEARCH_TIMEOUT_SECONDS = {
  default: 25,
  min: 1,
  max: 120,
} as const;

export const SEARCH_MAX_RESULTS = {
  default: 8,
  min: 1,
  max: 20,
} as const;

const FETCH_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_MAX_REDIRECTS = 5;

const DEFAULTS = {
  fetchDefaultFormat: "markdown",
  fetchTimeoutSeconds: FETCH_TIMEOUT_SECONDS.default,
  fetchMaxResponseBytes: FETCH_MAX_RESPONSE_BYTES,
  fetchBlockPrivateHosts: true,
  fetchMaxRedirects: FETCH_MAX_REDIRECTS,
  fetchFallbackUserAgent: "opencode",
  searchProvider: "exa",
  searchTimeoutSeconds: SEARCH_TIMEOUT_SECONDS.default,
  searchDefaultMaxResults: SEARCH_MAX_RESULTS.default,
  searchDefaultDepth: "auto",
} as const;

/** Clamp a finite number to an inclusive integer range. */
export function clampInteger(
  value: number,
  bounds: { readonly min: number; readonly max: number; readonly fallback: number },
): number {
  if (!Number.isFinite(value)) {
    return bounds.fallback;
  }

  return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
}

/** Parse search provider settings from the process environment. */
const EXA_ENDPOINT_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_EXA_ENDPOINT";
const SEARCH_PROVIDER_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_SEARCH_PROVIDER";
const PARALLEL_ENDPOINT_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_PARALLEL_ENDPOINT";

function parseEnumSetting<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback;
  const normalized = value.trim() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export function getWebSearchSettings(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): WebToolsSettings["search"] {
  const provider = parseEnumSetting(
    environment[SEARCH_PROVIDER_ENVIRONMENT_VARIABLE],
    SEARCH_PROVIDERS,
    DEFAULTS.searchProvider,
  );
  const endpointVariable =
    provider === "parallel"
      ? PARALLEL_ENDPOINT_ENVIRONMENT_VARIABLE
      : EXA_ENDPOINT_ENVIRONMENT_VARIABLE;
  const endpoint = environment[endpointVariable];
  if (!endpoint?.trim()) {
    throw new Error(
      `Pi Web Tools configuration error: ${endpointVariable} is required for websearch`,
    );
  }

  return {
    enabled: true,
    provider,
    endpoint: parseSearchEndpoint(endpoint, endpointVariable),
    timeoutSeconds: DEFAULTS.searchTimeoutSeconds,
    defaultMaxResults: DEFAULTS.searchDefaultMaxResults,
    defaultDepth: DEFAULTS.searchDefaultDepth,
  };
}

function parseSearchEndpoint(input: string, environmentVariable: string): PublicHttpUrl {
  const parsed = parsePublicHttpUrl(input);
  if (parsed._tag === "err") {
    throw new Error(
      `Pi Web Tools configuration error: ${environmentVariable} must be a public HTTP or HTTPS URL`,
    );
  }
  return parsed.value;
}
