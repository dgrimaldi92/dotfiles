import { Text } from "@earendil-works/pi-tui";
import { appendExpandedPreview, appendExpandHint, getTextContent } from "./utils";
import type { WebFetchFormat, WebFetchDetails } from "../domain/types";
import { formatSize } from "@earendil-works/pi-coding-agent";

interface RenderTheme {
  fg(name: string, value: string): string;
  bold(value: string): string;
}
export function renderResult(
  result: {
    content: Array<{ type: string; text?: string }>;
    details?: WebFetchDetails;
    isError?: boolean;
  },
  options: { expanded: boolean; isPartial: boolean },
  theme: RenderTheme,
) {
  if (options.isPartial) {
    return new Text(theme.fg("warning", "Fetching..."), 0, 0);
  }
  if (result.isError) {
    return new Text(
      theme.fg("error", `✗ ${getTextContent(result.content) || "Fetch failed"}`),
      0,
      0,
    );
  }

  const details = result.details;
  let text = theme.fg("success", "✓ Fetched");
  if (details?.mime) {
    text += theme.fg("muted", ` (${details.mime})`);
  }
  if (details?.bytes) {
    text += theme.fg("dim", ` ${formatSize(details.bytes)}`);
  }
  if (details?.truncated) {
    text += theme.fg("warning", " [truncated]");
  }
  if (details?.image) {
    text += theme.fg("muted", " [image]");
  }
  text = appendExpandHint(text, options.expanded);

  if (options.expanded) {
    if (details?.image) {
      text += `\n${theme.fg("dim", `Image URL: ${details.finalUrl}`)}`;
    } else {
      text = appendExpandedPreview(text, getTextContent(result.content), theme, {
        maxLines: 12,
        maxColumns: 220,
      });
    }
    if (details?.fullOutputPath) {
      text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
    }
  }

  return new Text(text, 0, 0);
}
export function renderCall(args: { url: string; format?: WebFetchFormat }, theme: RenderTheme) {
  let text = theme.fg("toolTitle", theme.bold("webfetch "));
  text += theme.fg("accent", redactUrlCredentialsForDisplay(args.url));
  if (args.format && args.format !== "markdown") {
    text += theme.fg("muted", ` (${args.format})`);
  }
  return new Text(text, 0, 0);
}
