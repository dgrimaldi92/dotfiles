import { PublicHttpUrl } from "./url-parser";

export type WebFetchFormat = "markdown" | "text" | "html";
export type SearchDepth = "auto" | "fast" | "deep";
export type SearchProviderName = "exa" | "tavily";

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
