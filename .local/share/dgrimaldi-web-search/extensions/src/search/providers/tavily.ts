import { HttpTextClient, MAX_SEARCH_RESPONSE_BYTES } from "../../shared/http-parser";
import { PublicHttpUrl } from "../../shared/url-parser";
import { mapHttpClientError, SearchProvider, SearchProviderError } from "./providers";
import { Result, err, ok } from "../../shared/result";
import { NormalizedSearchResult } from "../domain/types";
import { encodeTavilySearchRequest, parseTavilyMcpResponse } from "./tavily-protocol";
import { ProtocolParseError } from "./utils";
import { ParseSearchTextResult } from "./results";

function renderProtocolReason(error: ProtocolParseError): string {
  switch (error._tag) {
    case "InvalidJson":
      return `Invalid JSON ${error.source} payload`;
    case "InvalidMcpPayload":
      return error.reason;
    case "NoMcpMessages":
      return "No MCP messages";
  }
}

export const createTavilySearchProvider = (deps: {
  readonly endpoint: PublicHttpUrl;
  readonly http: HttpTextClient;
}): SearchProvider | undefined => {
  const name = "tavily" as const;

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
          body: encodeTavilySearchRequest(input),
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

      const protocol = parseTavilyMcpResponse(response.value.bodyText, contentType);
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
      const parsedText = protocol.value
        .filter((message) => message._tag === "Text")
        .map((message) => message.text) as unknown as string;

      const parsedResponse = JSON.parse(parsedText);
      const parsedResults: ParseSearchTextResult = {
        results: parsedResponse["results"],
        discardedSections: 0,
        explicitNoResults: parsedResponse["results"].length,
      };
      if (parsedResults.results.length === 0 && !parsedResults.explicitNoResults) {
        return err({ _tag: "SearchProviderNoRecognizedResults", provider: name });
      }

      return ok(parsedResults.results.slice(0, input.maxResults));
    },
  };
};
