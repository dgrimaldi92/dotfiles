import { parseHTML } from "linkedom";
import { Defuddle } from "defuddle/node";
import { logger } from "../../shared/logger";

const RAW_HTML_BLOCK_TAG_RE =
  /<(table|tbody|thead|tfoot|tr|td|th|div|section|article|main|header|footer|nav|aside)\b/gi;

export async function htmlToMarkdown(rawHtml: string, baseUrl: string): Promise<string> {
  // const sanitizedHtml = sanitizeHtml(rawHtml, baseUrl);
  const { document } = parseHTML(rawHtml);
  const markdown = await Defuddle(document, baseUrl, { markdown: true });
  return cleanupMarkdown(markdown.content);
}

export function isPoorMarkdownConversion(markdown: string): boolean {
  const rawBlockTags = markdown.match(RAW_HTML_BLOCK_TAG_RE)?.length ?? 0;
  if (rawBlockTags >= 6) return true;
  if (/^\s*<(table|tbody|thead|tfoot|tr|td|th|div|section|article|main)\b/i.test(markdown))
    return true;
  return false;
}

function cleanupMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(
      /\[\s*\n+(#{1,6})\s+([^\n]+?)\s*\n+\s*\]\(([^)]+)\)/g,
      (_match, hashes: string, text: string, url: string) => {
        return `${hashes} [${text.trim()}](${url})`;
      },
    )
    .replace(/^\[\]\([^)]+\)\n?/gm, "")
    .replace(/(\]\([^)]+\))(?=\[)/g, "$1 ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
