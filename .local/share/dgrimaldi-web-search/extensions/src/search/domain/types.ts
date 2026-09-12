import { PublicHttpUrl } from "../../shared/url-parser";

export const WEB_TOOLS_EXTENSION_NAME = "web-tools";

/** A non-empty, trimmed search query. */
export type SearchQuery = string & { readonly __brand: "SearchQuery" };

export interface NormalizedSearchResult {
  readonly title: string;
  readonly url: PublicHttpUrl;
  readonly content?: string;
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
