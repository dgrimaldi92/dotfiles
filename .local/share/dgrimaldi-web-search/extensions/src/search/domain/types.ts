import { PublicHttpUrl } from "@/shared/url-parser";

export const WEB_TOOLS_EXTENSION_NAME = "web-tools";

/** A non-empty, trimmed search query. */
export type SearchQuery = string & { readonly __brand: "SearchQuery" };

export type WebFetchFormat = "markdown" | "text" | "html";
export type SearchDepth = "auto" | "fast" | "deep";
export type SearchProviderName = "exa" | "parallel";

export type ParseSearchQueryError = { readonly _tag: "EmptySearchQuery" };

export interface WebToolsSettings {
  readonly fetch: {
    readonly defaultFormat: WebFetchFormat;
    readonly timeoutSeconds: number;
    readonly maxResponseBytes: number;
    readonly blockPrivateHosts: boolean;
    readonly maxRedirects: number;
    readonly fallbackUserAgent: string;
  };
  readonly search: {
    readonly enabled: boolean;
    readonly provider: SearchProviderName;
    readonly endpoint: PublicHttpUrl;
    readonly timeoutSeconds: number;
    readonly defaultMaxResults: number;
    readonly defaultDepth: SearchDepth;
  };
}

export interface NormalizedSearchResult {
  readonly title: string;
  readonly url: PublicHttpUrl;
  readonly snippet?: string;
  readonly publishedAt?: string;
  readonly source?: string;
  readonly score?: number;
}

export interface WebSearchDetails {
  readonly query: string;
  readonly depth: SearchDepth;
  readonly maxResults: number;
  readonly provider: SearchProviderName;
  readonly resultCount: number;
  readonly truncated?: boolean;
  readonly fullOutputPath?: string;
  readonly results: readonly NormalizedSearchResult[];
}
