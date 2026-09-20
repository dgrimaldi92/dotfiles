# Codebase search (retrieval)

`codebase_search` lets a sub-agent pull **only the most relevant code** into its
context window instead of reading whole files or dumping the entire tree. It's
the piece that most helps a **local model with a small context window**: rather
than ingesting everything, the agent asks the indexer for the handful of chunks
that actually answer the question.

- **Zero dependencies** — pure TypeScript, no network, no embeddings.
- **BM25 ranking** — the same keyword retrieval idea Wikipedia/search engines use.
- **Line-accurate** — every result points at a concrete `file (lines A–B)`.
- **Cached & incremental** — the index lives under `.memory/codebase-index/`
  (gitignored) and re-indexes only files that changed since last time.

> This is keyword retrieval, not semantic search. It excels at identifiers,
> function/type names, and short phrases. For "what does X mean" prose, phrase
> the query as keywords (`authenticateUser token verify`) rather than a sentence.

---

## For agents (using the tool)

Agents that have `codebase_search` in their `tools` (the bundled `scout`,
`searcher`, and `worker`) can call it directly:

```
codebase_search({
  query: "authenticateUser token verify",
  maxResults: 8
})
```

### Query tips

- **Use keywords / identifiers**, not full sentences.
  - ✅ `loadBalance router middleware`
  - ✅ `config flag parsing`
  - ⚠️ `find the function that handles authentication`
- **One focused query at a time.** If you need several things, run multiple
  `codebase_search` calls (they can even be parallel).
- **Read the score.** Higher `score` = more relevant. Scan the top hits before
  drilling in.
- **Don't trust a chunk blindly.** The body is returned verbatim; confirm the
  location with `grep`/`read` (via `safe_bash`) before editing.
- **Refine.** If the top hits miss, drop a more specific identifier or a sibling
  term and search again.

### What a result looks like

```
### src/auth.ts (lines 42-61, score 6.83)
```

function authenticateUser(token: string) {
const claims = token.verify();
...
}

```

```

Each chunk includes the file, the line range, a relevance score, and the raw
code body — enough to understand and reference without opening the file.

---

## For agent authors (adding it to a custom agent)

Add `codebase_search` to the agent's `tools` frontmatter:

```markdown
---
name: my-retriever
description: Finds relevant code chunks in this repo
tools: codebase_search, safe_bash
model: openrouter/z-ai/glm-5.3
thinking: low
auto-exit: true
---
```

The tool is backed by `pi-extension/subagents/tools/codebase-search.ts` and is
registered automatically for any agent that lists it (see
`getToolExtensionPath` in the extension entry).

---

## For developers (calling the API directly)

The retrieval logic lives in `pi-extension/subagents/retriever.ts`. It's a
plain module you can import and use outside of pi.

```ts
import {
  search, // build/load index + run BM25 in one call
  indexDirectory, // build an in-memory index (no persistence)
  bm25Search, // score a query against a set of chunks
  loadOrReindex, // load cached index, re-index changed files
  clearIndex, // delete the on-disk cache
  indexStats, // { chunks, files, root } or null
  tokenize, // text -> lowercased identifier tokens
} from "./pi-extension/subagents/retriever.ts";

// The common case:
const results = search(process.cwd(), "loadBalance router", {
  topK: 12, // max results (default 12)
  minScore: 0.5, // score floor (default 0.5)
});

for (const r of results) {
  console.log(
    r.relPath, // "pkg/foo.ts" (posix)
    r.startLine,
    r.endLine, // 1-based line range
    r.score, // BM25 score
    r.snippet, // first meaningful line, trimmed
    r.body, // full chunk text
  );
}
```

### API reference

| Function                         | Purpose                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `search(root, query, opts?)`     | Convenience: load-or-reindex the index at `root`, then BM25-search. |
| `indexDirectory(root, opts?)`    | Build an in-memory `ChunkDoc[]` over `root` (no disk cache).        |
| `bm25Search(docs, query, opts?)` | Score `query` against already-built chunks.                         |
| `loadOrReindex(root, opts?)`     | Load the persisted index, re-tokenizing only changed files.         |
| `clearIndex(root)`               | Delete `.memory/codebase-index/`.                                   |
| `hasIndex(root)`                 | Whether an index exists on disk.                                    |
| `indexStats(root)`               | `{ chunks, files, root }` or `null`.                                |
| `tokenize(text)`                 | Split text into normalized tokens.                                  |

### Options

**`RetrieveOptions`** (query):

- `topK?: number` — max results (default `12`).
- `minScore?: number` — keep only results at or above this score (default `0.5`).

**`IndexOptions`** (build):

- `includeExt?: Set<string>` — file extensions to index (default: source +
  text-ish files).
- `excludeDirs?: Set<string>` — extra directory names to skip (default includes
  `node_modules`, `.git`, `dist`, `build`, etc.).
- `force?: boolean` — ignore any cached index and rebuild from scratch.

**`BM25Params`** (scoring):

- `k1?: number` — term saturation (default `1.5`).
- `b?: number` — length normalization (default `0.75`).

---

## How indexing works

1. **Walk** `root`, skipping excluded dirs and binary files (anything with a NUL
   byte).
2. **Chunk** each file into overlapping windows of `CHUNK_SIZE` lines
   (`40`) with `CHUNK_OVERLAP` (`8`) lines of overlap, so a result never splits
   awkwardly across a boundary.
3. **Tokenize** each chunk: lowercased, split on case/separator transitions so
   `authMiddleware`, `AuthMiddleware`, and `auth/middleware` all map to the same
   vocabulary.
4. **Rank** queries with BM25: `IDF · tf-saturation · length-normalization`, with
   a small bonus for covering more distinct query terms.
5. **Persist** the index + per-file mtimes under
   `.memory/codebase-index/index.json`. On the next run, only files whose mtime
   changed are re-tokenized — the rest are reused from cache.

### Tuning

Edit the constants at the top of `retriever.ts`:

| Constant        | Default | Meaning                                            |
| --------------- | ------- | -------------------------------------------------- |
| `CHUNK_SIZE`    | `40`    | Lines per chunk. Bigger = more context per result. |
| `CHUNK_OVERLAP` | `8`     | Overlap between adjacent chunks.                   |
| `DEFAULT_TOP_K` | `12`    | Default results per query.                         |
| `MIN_SCORE`     | `0.5`   | Score floor. Low so tiny repos still return hits.  |

---

## FAQ

**Q: Why not semantic/embedding search?**
Embeddings need a model and usually a vector store — heavier for a local setup
and overkill for "find this function." BM25 is instant, dependency-free, and
excellent for code, which is dominated by identifiers.

**Q: The index is stale after I edit files.**
It re-indexes incrementally on the next query. To force a full rebuild, call
`clearIndex(root)` or pass `{ force: true }` to `loadOrReindex`.

**Q: Can a read-only agent use this safely?**
Yes. `codebase_search` only reads files; it executes no code. It's safe to grant
to read-only agents like `scout` and `searcher`.

**Q: What gets indexed?**
Source and text-ish files (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.md`, `.json`,
etc.) under the working root. `node_modules`, `.git`, `dist`, `build`, and other
vendor dirs are excluded.
