import { SearchDepth, SearchProviderName, WebToolsSettings } from "../../shared/web-tools";
import { PublicHttpUrl, parsePublicHttpUrl } from "../../shared/url-parser";
import { DEFAULTS } from "../../shared/config";

export const SEARCH_DEPTHS = ["auto", "fast", "deep"] as const satisfies readonly SearchDepth[];
export const SEARCH_PROVIDERS = ["exa", "tavily"] as const satisfies readonly SearchProviderName[];

/** Parse search provider settings from the process environment. */
const EXA_ENDPOINT_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_EXA_ENDPOINT";
// const SEARCH_PROVIDER_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_SEARCH_PROVIDER";
const TAVILY_ENDPOINT_ENVIRONMENT_VARIABLE = "PI_WEB_TOOLS_TAVILY_ENDPOINT";

function parseEnumSetting<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

// TODO create config file to store active providers
// function parseBooleanSetting(value: string | undefined, fallback: boolean): boolean {
//   if (!value) return fallback;
//   const lower = value.trim().toLowerCase();
//   if (lower === "false" || lower === "0" || lower === "no") return false;
//   if (lower === "true" || lower === "1" || lower === "yes") return true;
//   return fallback;
// }

export function getWebSearchSettings(
  providerName: SearchProviderName,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): WebToolsSettings["search"] {
  const provider = parseEnumSetting(
    // environment[SEARCH_PROVIDER_ENVIRONMENT_VARIABLE],
    providerName,
    SEARCH_PROVIDERS,
    DEFAULTS.searchProvider,
  );
  const endpointVariable =
    provider === "exa" ? EXA_ENDPOINT_ENVIRONMENT_VARIABLE : TAVILY_ENDPOINT_ENVIRONMENT_VARIABLE;
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
