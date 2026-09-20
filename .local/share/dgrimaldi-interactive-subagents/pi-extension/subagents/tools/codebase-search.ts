/**
 * Codebase search extension.
 *
 * Dependency-free BM25 retrieval over the working codebase. Lets an agent pull
 * only the most relevant line-accurate chunks into context instead of reading
 * whole files or dumping the entire tree — which matters most for small local
 * models with a tight context window.
 *
 * Loaded into a child pi process via `--extension` when an agent's `tools`
 * frontmatter lists `codebase_search`. The index is cached under
 * `<root>/.memory/codebase-index/` (gitignored) and re-indexed incrementally.
 *
 * Note: this tool reads files from disk but performs NO code execution, so it
 * is safe to grant to read-only agents.
 */
import { Type } from "typebox";
import { search } from "../retriever";
import { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_ROOT = process.cwd();

function formatResults(root: string, query: string, maxResults: number): string {
  const results = search(root, query, { topK: maxResults });
  if (results.length === 0) {
    return (
      `No matching code chunks found for: "${query}".\n` +
      `Try simpler/keyword queries (e.g. a function name, type name, or phrase). ` +
      `The index covers source and text files under ${root} (excluding node_modules, dist, etc.).`
    );
  }

  const lines: string[] = [];
  lines.push(`Found ${results.length} relevant chunk(s) for "${query}":\n`);
  for (const r of results) {
    lines.push(`### ${r.relPath} (lines ${r.startLine}-${r.endLine}, score ${r.score.toFixed(2)})`);
    lines.push("```");
    lines.push(r.body);
    lines.push("```");
  }
  return lines.join("\n\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "codebase_search",
    label: "Codebase Search",
    description:
      "Search the codebase for the most relevant code chunks using keyword (BM25) retrieval. " +
      "Use it to locate functions, types, or logic without knowing exact file paths. " +
      "Returns line-accurate chunks with scores. Prefer keyword queries (identifiers, phrases) over natural language.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "What to find. Keywords/identifiers/phrases work best, e.g. 'authenticateUser token verify' or 'loadBalance'.",
      }),
      maxResults: Type.Optional(
        Type.Number({
          type: "integer",
          minimum: 1,
          maximum: 40,
          description: "Max chunks to return (default 12).",
        }),
      ),
    }),
    async execute(toolCallId, params, _signal, onUpdate) {
      const maxResults = params.maxResults ?? 12;
      const out = formatResults(DEFAULT_ROOT, params.query, maxResults);
      onUpdate?.({ result: out }, toolCallId);
      return { result: out };
    },
  });
}
