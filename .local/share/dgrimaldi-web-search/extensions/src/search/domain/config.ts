import type { SearchDepth, SearchProviderName, WebFetchFormat } from "./types";

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
