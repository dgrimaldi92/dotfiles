import { Text } from "@earendil-works/pi-tui";
import { appendExpandedPreview, appendExpandHint, getTextContent } from "./utils";
import type { SearchDepth, WebSearchDetails } from "@/search/domain/types";

import type { WebSearchBoundaryError } from "@/search/api/websearch.ts";
interface RenderTheme {
  fg(name: string, value: string): string;
  bold(value: string): string;
}
export function renderResult(
  result: {
    content: Array<{ type: string; text?: string }>;
    details?: WebSearchDetails;
    isError?: boolean;
  },
  options: { expanded: boolean; isPartial: boolean },
  theme: RenderTheme,
): Text {
  if (options.isPartial) {
    return new Text(theme.fg("warning", "Searching..."), 0, 0);
  }
  if (result.isError) {
    return new Text(
      theme.fg("error", `✗ ${getTextContent(result.content) || "Search failed"}`),
      0,
      0,
    );
  }

  const details = result.details;
  let text = theme.fg("success", `✓ ${details?.resultCount ?? 0} results`);
  if (details?.provider) {
    text += theme.fg("muted", ` (${details.provider})`);
  }
  if (details?.truncated) {
    text += theme.fg("warning", " [truncated]");
  }
  text = appendExpandHint(text, options.expanded);

  if (options.expanded) {
    text = appendExpandedPreview(text, getTextContent(result.content), theme, {
      maxLines: 16,
      maxColumns: 220,
    });
    if (details?.fullOutputPath) {
      text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
    }
  }

  return new Text(text, 0, 0);
}

export function renderCall(
  args: { query: string; depth?: SearchDepth; maxResults?: number },
  theme: RenderTheme,
): Text {
  let text = theme.fg("toolTitle", theme.bold("websearch "));
  text += theme.fg("accent", JSON.stringify(String(args.query)));
  if (args.depth && args.depth !== "auto") {
    text += theme.fg("muted", ` (${args.depth})`);
  }
  if (args.maxResults) {
    text += theme.fg("dim", ` limit=${args.maxResults}`);
  }
  return new Text(text, 0, 0);
}
