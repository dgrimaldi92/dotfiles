import { err, ok, Result } from "@/shared/result";
import { mapHttpClientError, SearchProvider, SearchProviderError } from "./providers";
import { PublicHttpUrl } from "@/shared/url-parser";
import { encodeExaSearchRequest, ExaProtocolParseError, parseExaMcpResponse } from "./exa-protocol";
import { parseExaSearchText } from "./exa-results";
import { HttpTextClient } from "@/shared/http-parser";
import { NormalizedSearchResult } from "../domain/types";

export const MAX_SEARCH_RESPONSE_BYTES = 1 * 1024 * 1024;
function renderProtocolReason(error: ExaProtocolParseError): string {
  switch (error._tag) {
    case "InvalidJson":
      return `Invalid JSON ${error.source} payload`;
    case "InvalidMcpPayload":
      return error.reason;
    case "NoMcpMessages":
      return "No MCP messages";
  }
}

export const createExaSearchProvider = (deps: {
  readonly endpoint: PublicHttpUrl;
  readonly http: HttpTextClient;
}): SearchProvider => {
  const name = "exa" as const;

  /** Search Exa through its MCP endpoint and return normalized public-web results. */
  return {
    name,
    async search(
      input,
      options = {},
    ): Promise<Result<readonly NormalizedSearchResult[], SearchProviderError>> {
      const response = await deps.http.postJson(
        {
          url: deps.endpoint,
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
          },
          body: encodeExaSearchRequest(input),
          maxResponseBytes: MAX_SEARCH_RESPONSE_BYTES,
        },
        { signal: options.signal },
      );

      if (response._tag === "err") {
        return err(mapHttpClientError(response.error));
      }

      if (response.value.status < 200 || response.value.status >= 300) {
        return err({
          _tag: "SearchProviderStatusRejected",
          provider: name,
          status: response.value.status,
        });
      }

      const contentType = response.value.headers.get("content-type") ?? "";
      const protocol = parseExaMcpResponse(response.value.bodyText, contentType);
      if (protocol._tag === "err") {
        return err({
          _tag: "SearchProviderProtocolInvalid",
          provider: name,
          reason: renderProtocolReason(protocol.error),
        });
      }

      const providerError = protocol.value.find((message) => message._tag === "ProviderError");
      if (providerError?._tag === "ProviderError") {
        return err({
          _tag: "SearchProviderReturnedError",
          provider: name,
          safeMessage: providerError.safeMessage,
        });
      }

      const searchText = protocol.value
        .filter((message) => message._tag === "Text")
        .map((message) => message.text)
        .join("\n\n")
        .trim();
      const parsedResults = parseExaSearchText(searchText);

      if (parsedResults.results.length === 0 && !parsedResults.explicitNoResults) {
        return err({ _tag: "SearchProviderNoRecognizedResults", provider: name });
      }

      return ok(parsedResults.results.slice(0, input.maxResults));
    },
  };
};
