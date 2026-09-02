import { keyHint } from "@earendil-works/pi-coding-agent";

export type PiTextContent = { readonly type: "text"; readonly text: string };
export type PiImageContent = {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
};

export interface PiToolResult<Details> {
  readonly content: Array<PiTextContent | PiImageContent>;
  readonly details: Details;
}

export function getTextContent(
  content: Array<{ type: string; text?: string }> | undefined,
): string {
  if (!content) return "";
  return content
    .filter(
      (item): item is { type: "text"; text: string } =>
        item.type === "text" && typeof item.text === "string",
    )
    .map((item) => item.text)
    .join("\n");
}

export function appendExpandedPreview(
  base: string,
  text: string,
  theme: {
    fg: (name: string, value: string) => string;
  },
  options: { maxLines?: number; maxColumns?: number } = {},
): string {
  const maxLines = options.maxLines ?? 12;
  const maxColumns = options.maxColumns ?? 200;
  const lines = text.split("\n");
  for (const line of lines.slice(0, maxLines)) {
    base += `\n${theme.fg("dim", line.slice(0, maxColumns))}`;
  }
  if (lines.length > maxLines) {
    base += `\n${theme.fg("muted", "...")}`;
  }
  return base;
}

export function appendExpandHint(base: string, expanded: boolean): string {
  if (expanded) return base;
  return `${base} ${keyHint("app.tools.expand" as any, "for details")}`;
}

function textContent(text: string): PiTextContent {
  return { type: "text", text };
}
