import { err, ok } from "@/shared/result";

export const createExaSearchProvider = (deps: {
  readonly endpoint: PublicHttpUrl;
  readonly http: HttpTextClient;
}): SearchProvider => {
  const name = "exa" as const;

  /** Search Exa through its MCP endpoint and return normalized public-web results. */
  const search: SearchSites = async (input, options = {}) => {
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
  };

  return { name, search };
};
