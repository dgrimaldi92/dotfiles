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

export const DEFAULTS = {
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
