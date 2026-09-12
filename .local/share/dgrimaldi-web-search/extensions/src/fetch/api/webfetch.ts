import { createOperationSignal } from "../../shared/network";
import { Type, StringEnum } from "@earendil-works/pi-ai";
import { getWebFetchSettings, WEB_FETCH_FORMATS } from "../domain/config";
import { WebFetchDetails } from "../domain/types";
import {
  textContent,
  projectFetchPageResultToPiToolResult,
  ToolOutputStore,
  writeTempFile,
} from "../presentation/agent-view";
import { PiToolResult } from "../presentation/utils";
import { toWebFetchToolError, toWebFetchBoundaryError } from "./errors";
import { renderCall, renderResult } from "../presentation/tui";
import { WebToolsSettings } from "../../shared/web-tools";
import { createWebFetch, FetchPage } from "../composition/web-fetch";
import { createFetchPublicWebClient } from "../composition/web-client";
import { parseWebFetchToolParams } from "../presentation/input";

interface WebFetchToolComposition {
  readonly settings: WebToolsSettings["fetch"];
  readonly fetchPage: FetchPage;
  readonly outputStore: ToolOutputStore;
}

function createDefaultWebFetchComposition(): WebFetchToolComposition {
  const settings = getWebFetchSettings();
  return {
    settings,
    fetchPage: createWebFetch({ publicWeb: createFetchPublicWebClient(), settings }),
    outputStore: writeTempFile(),
  };
}

export function createWebFetchTool() {
  return {
    name: "webfetch",
    label: "Web Fetch",
    description:
      "Fetch a single URL and return readable markdown, text, raw HTML/source, or an inline raster image.",
    promptSnippet: "Fetch one public URL as markdown, text, html, or an inline raster image",
    promptGuidelines: [
      "Use webfetch when the user provides a URL or after websearch identifies a page to inspect.",
      "Prefer webfetch format=markdown unless the user explicitly wants plain text or raw source.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "The http:// or https:// URL to fetch." }),
      // format: Type.Optional(
      //   StringEnum([...WEB_FETCH_FORMATS], {
      //     description: "Return format. Defaults to the web-tools fetch default format setting.",
      //   }),
      // ),
      timeout: Type.Optional(
        Type.Number({
          description:
            "Optional timeout in seconds. Overrides the web-tools fetch timeout setting.",
        }),
      ),
    }),

    async execute(
      _toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: (update: PiToolResult<WebFetchDetails>) => void,
    ) {
      const actualComposition = createDefaultWebFetchComposition();
      const parsed = parseWebFetchToolParams(params, actualComposition.settings);
      if (parsed._tag === "err") {
        throw toWebFetchToolError(parsed.error);
      }

      const composed = createOperationSignal(parsed.value.timeoutSeconds * 1000, signal);
      onUpdate?.({
        content: [textContent(`Fetching ${parsed.value.url}...`)],
        details: {
          requestedUrl: parsed.value.url,
          finalUrl: parsed.value.url,
          format: parsed.value.format,
          status: 0,
          mime: "",
          contentType: "",
          bytes: 0,
        },
      });

      try {
        const result = await actualComposition.fetchPage.fetch(
          { url: parsed.value.url, format: parsed.value.format },
          { signal: composed.signal },
        );
        if (result._tag === "err") {
          throw toWebFetchBoundaryError(
            result.error,
            parsed.value.timeoutSeconds,
            signal,
            composed.signal,
          );
        }

        const projected = await projectFetchPageResultToPiToolResult(
          result.value,
          actualComposition.outputStore,
        );
        if (projected._tag === "err") {
          throw toWebFetchBoundaryError(
            projected.error,
            parsed.value.timeoutSeconds,
            signal,
            composed.signal,
          );
        }

        return projected.value;
      } finally {
        composed.cleanup();
      }
    },
    renderCall,
    renderResult,
  };
}
