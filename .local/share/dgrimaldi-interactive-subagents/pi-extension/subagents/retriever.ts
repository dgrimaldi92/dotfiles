/**
 * Codebase retrieval — a dependency-free BM25 indexer + query API.
 *
 * Purpose: let a sub-agent (or the orchestrator) pull only the most relevant
 * chunks of a codebase into context, instead of reading whole files or dumping
 * the entire tree into the model's context window. This is the "retrieval"
 * half of RAG, tuned for source code: line-accurate chunks, cheap to build,
 * cached on disk so it survives across spawns.
 *
 * Design notes:
 *   - Pure token-based BM25 (Robertson–Speck–Thomas). No embeddings, no network,
 *     no external deps — works for any local model and any machine.
 *   - Files are split into overlapping line windows (chunks) so a result points
 *     at a concrete `startLine..endLine` range, not a whole file.
 *   - The index is persisted under `<root>/.memory/codebase-index/` (gitignored).
 *     Per-file mtimes are tracked so only changed files are re-tokenized.
 *   - Everything here is synchronous and pure where possible so it is trivial to
 *     unit-test. The only IO lives in `indexDirectory` / `search`.
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

// ── Tunables ────────────────────────────────────────────────────────────────

/** Lines per chunk. Larger = more context per result, coarser granularity. */
export const CHUNK_SIZE = 40;
/** Lines of overlap between adjacent chunks so boundaries never split a result. */
export const CHUNK_OVERLAP = 8;
/** Default number of chunks returned per query. */
export const DEFAULT_TOP_K = 12;
/** Minimum BM25 score to keep a result (filters pure noise). Kept low so it
 * also works on tiny repos where absolute BM25 scores are small. */
export const MIN_SCORE = 0.5;

/** Default file selection: source + text-ish files, nothing binary or vendored. */
export const DEFAULT_INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp",
  ".rb",
  ".php",
  ".swift",
  ".scala",
  ".sh",
  ".bash",
  ".json",
  ".jsonc",
  ".json5",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".md",
  ".mdx",
  ".txt",
  ".rst",
  ".sql",
  ".graphql",
  ".graphqls",
]);

/** Directories that never hold first-party source worth indexing. */
const DEFAULT_EXCLUDE_DIR = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "vendor",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
  ".memory",
  "bin",
  "obj",
]);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChunkDoc {
  /** Absolute path. */
  file: string;
  /** Repo-relative path (posix separators). */
  relPath: string;
  /** 1-based line of the first line in the chunk. */
  startLine: number;
  /** 1-based line of the last line in the chunk. */
  endLine: number;
  /** Raw chunk text (for snippets). */
  text: string;
  /** Token count (document length). */
  length: number;
  /** Pre-tokenized tokens. */
  tokens: string[];
}

export interface SearchResult {
  file: string;
  relPath: string;
  startLine: number;
  endLine: number;
  score: number;
  /** First non-empty line of the chunk, trimmed — a one-line preview. */
  snippet: string;
}

export interface IndexStats {
  chunks: number;
  files: number;
  /** Repo root the index was built against. */
  root: string;
}

export interface RetrieveOptions {
  /** Max results. */
  topK?: number;
  /** Min score threshold. */
  minScore?: number;
}

export interface IndexOptions {
  /** Glob of file extensions to include. Default: source + text-ish. */
  includeExt?: Set<string>;
  /** Extra directory names to skip. */
  excludeDirs?: Set<string>;
  /** Force a full re-index even if cached index exists. */
  force?: boolean;
}

// ── Tokenization ─────────────────────────────────────────────────────────────

/**
 * Split text into lowercased identifier-aware tokens.
 * Handles camelCase / PascalCase / snake_case / kebab-case and dotted paths so
 * that `authMiddleware`, `AuthMiddleware`, `auth/middleware` all normalize to
 * the same vocabulary as their parts.
 */
export function tokenize(text: string): string[] {
  // Insert boundaries at case / delimiter transitions, then split.
  const normalized = text
    // separators
    .replace(/[._\/\\@\s\d]+/g, " ")
    // camelCase -> camel Case (lower->upper already split; handle a->B)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // snake/kebab already handled by separator class above
    .toLowerCase();

  const out: string[] = [];
  for (const part of normalized.split(" ")) {
    if (!part) continue;
    // further split snake_case and kebab within a token
    for (const sub of part.split(/[_-]+/)) {
      if (sub) out.push(sub);
    }
  }
  return out;
}

/** Stopword-ish filter: drop very short / non-informative tokens. */
function isUsefulToken(t: string): boolean {
  return t.length >= 2;
}

// ── Index build ──────────────────────────────────────────────────────────────

function walk(root: string, excludeDirs: Set<string>): string[] {
  const files: string[] = [];
  const collect = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (entry !== "." && entry !== ".." && !excludeDirs.has(entry)) collect(full);
      } else if (st.isFile()) {
        files.push(full);
      }
    }
  };
  collect(root);
  return files;
}

/**
 * Tokenize a single file into line-window chunks.
 * Returns [] for binary / unreadable / excluded files.
 */
function chunkFile(file: string, root: string, includeExt: Set<string>): ChunkDoc[] {
  const ext = extname(file);
  if (!includeExt.has(ext)) return [];

  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  // Hard stop on obvious binary (NUL byte).
  if (raw.includes("\0")) return [];

  const lines = raw.split(/\r?\n/);
  const relPath = toPosix(relative(root, file));
  const docs: ChunkDoc[] = [];
  const n = lines.length;
  if (n === 0) return docs;

  const step = Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP);
  for (let start = 0; start < n; start += step) {
    const end = Math.min(n - 1, start + CHUNK_SIZE - 1);
    const lineSlice = lines.slice(start, end + 1);
    // Drop chunks that are entirely blank.
    if (lineSlice.every((l) => l.trim() === "")) {
      if (end >= n - 1) break;
      continue;
    }
    const text = lineSlice.join("\n");
    const tokens = tokenize(text).filter(isUsefulToken);
    docs.push({
      file,
      relPath,
      startLine: start + 1,
      endLine: end + 1,
      text,
      length: tokens.length,
      tokens,
    });
    if (end >= n - 1) break;
  }
  return docs;
}

function extname(file: string): string {
  const i = file.lastIndexOf(".");
  return i >= 0 ? file.slice(i).toLowerCase() : "";
}
function toPosix(p: string): string {
  return p.split(sep).join("/");
}

/**
 * Build an in-memory index over `root`. Synchronous, pure (no persistence).
 */
export function indexDirectory(root: string, opts: IndexOptions = {}): ChunkDoc[] {
  const includeExt = opts.includeExt ?? DEFAULT_INCLUDE_EXT;
  const excludeDirs = new Set([...DEFAULT_EXCLUDE_DIR, ...(opts.excludeDirs ?? [])]);
  const files = walk(root, excludeDirs);
  const docs: ChunkDoc[] = [];
  for (const f of files) {
    const chunks = chunkFile(f, root, includeExt);
    for (const c of chunks) docs.push(c);
  }
  return docs;
}

// ── BM25 scoring ─────────────────────────────────────────────────────────────

export interface BM25Params {
  k1?: number; // term saturation, default 1.5
  b?: number; // length normalization, default 0.75
}

/**
 * Compute BM25 scores of a query (string or token array) against a set of
 * chunk docs. Returns results sorted descending, filtered by minScore.
 */
export function bm25Search(
  docs: ChunkDoc[],
  query: string | string[],
  opts: RetrieveOptions & BM25Params = {},
): SearchResult[] {
  const k1 = opts.k1 ?? 1.5;
  const b = opts.b ?? 0.75;
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const minScore = opts.minScore ?? MIN_SCORE;

  const qTokens = (Array.isArray(query) ? query : tokenize(query)).filter(isUsefulToken);
  if (qTokens.length === 0 || docs.length === 0) return [];

  const N = docs.length;
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / N;

  // Document frequency per term.
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set(d.tokens);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const idf = (term: string): number => {
    const dfn = df.get(term) ?? 0;
    // BM25+ style IDF, always non-negative.
    return Math.log((N - dfn + 0.5) / (dfn + 0.5) + 1);
  };

  const results: SearchResult[] = [];
  for (const d of docs) {
    if (d.length === 0) continue;
    // Term frequency with saturation.
    const tf = new Map<string, number>();
    for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    // Count how many query terms matched (boosts multi-term coverage).
    let matchedTerms = 0;
    const matchedSeen = new Set<string>();
    for (const qt of qTokens) {
      if (matchedSeen.has(qt)) continue;
      const tfn = tf.get(qt) ?? 0;
      if (tfn === 0) continue;
      matchedSeen.add(qt);
      matchedTerms++;
      const numerator = tfn * (k1 + 1);
      const denominator = tfn + k1 * (1 - b + (b * d.length) / avgLen);
      score += idf(qt) * (numerator / denominator);
    }
    if (matchedTerms === 0) continue;
    // Small bonus for covering more distinct query terms.
    score *= 1 + 0.05 * (matchedTerms - 1);

    if (score < minScore) continue;
    results.push({
      file: d.file,
      relPath: d.relPath,
      startLine: d.startLine,
      endLine: d.endLine,
      score,
      snippet: firstNonEmptyLine(d.text),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

function firstNonEmptyLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t.length > 120 ? t.slice(0, 117) + "…" : t;
  }
  return "";
}

// ── Persistence + incremental re-index ───────────────────────────────────────

const INDEX_DIRNAME = "codebase-index";
interface IndexFile {
  version: 1;
  root: string;
  chunks: ChunkDoc[];
  /** Absolute file path -> mtimeMs at build time, for incremental re-index. */
  mtimes?: Record<string, number>;
}

function indexDir(root: string): string {
  return join(root, ".memory", INDEX_DIRNAME);
}

function indexFilePath(root: string): string {
  return join(indexDir(root), "index.json");
}

/**
 * Load a persisted index for `root`, re-indexing any files whose mtime changed
 * since it was built (or when `force` is set). Returns the full chunk list.
 */
export function loadOrReindex(root: string, opts: IndexOptions = {}): ChunkDoc[] {
  const path = indexFilePath(root);
  const force = opts.force ?? false;

  let cached: IndexFile | null = null;
  if (!force && existsSync(path)) {
    try {
      cached = JSON.parse(readFileSync(path, "utf8")) as IndexFile;
    } catch {
      cached = null;
    }
  }

  let docs = indexDirectory(root, opts);

  // Incremental: if the cached index exists and points at the same root, only
  // re-chunk files whose mtime changed (cheap mtime check; full re-tokenize
  // only for the changed ones).
  if (cached && cached.root === root && !force) {
    const prevByLoc = new Map<string, ChunkDoc>();
    for (const c of cached.chunks) prevByLoc.set(`${c.relPath}:${c.startLine}:${c.endLine}`, c);

    const nowMtime = new Map<string, number>();
    const rebuilt: ChunkDoc[] = [];
    for (const d of docs) {
      let mtime = 0;
      try {
        mtime = statSync(d.file).mtimeMs;
      } catch {}
      nowMtime.set(d.file, mtime);
      const prev = prevByLoc.get(`${d.relPath}:${d.startLine}:${d.endLine}`);
      if (prev && prev.file === d.file && cached.mtimes?.[d.file] === mtime) {
        rebuilt.push(prev); // unchanged — reuse cached tokenization
      } else {
        rebuilt.push(d); // changed/new
      }
    }
    // Drop chunks whose file no longer exists.
    const aliveFiles = new Set(nowMtime.keys());
    docs = rebuilt.filter((d) => aliveFiles.has(d.file));
  }

  // Persist (with current mtimes) so next run can incrementally diff.
  const mtimes: Record<string, number> = {};
  for (const d of docs) {
    try {
      mtimes[d.file] = statSync(d.file).mtimeMs;
    } catch {}
  }
  writeIndexFile(path, { version: 1, root, chunks: docs, mtimes });
  return docs;
}

function writeIndexFile(path: string, data: IndexFile): void {
  try {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, JSON.stringify(data), "utf8");
  } catch {
    // Index is a cache; never let a write failure break the caller.
  }
}

/** Invalidate and delete the on-disk index for `root`. */
export function clearIndex(root: string): void {
  try {
    rmSync(indexDir(root), { recursive: true, force: true });
  } catch {}
}

/** Whether an index exists on disk for `root`. */
export function hasIndex(root: string): boolean {
  return existsSync(indexFilePath(root));
}

// ── High-level convenience ───────────────────────────────────────────────────

/**
 * Search the codebase at `root`. Builds/refreshes the index as needed, then
 * runs BM25. Returns ranked line-accurate results.
 */
export function search(root: string, query: string, opts: RetrieveOptions = {}): SearchResult[] {
  const docs = loadOrReindex(root);
  return bm25Search(docs, query, opts);
}

/** Lightweight stats for logging / a status line. */
export function indexStats(root: string): IndexStats | null {
  const path = indexFilePath(root);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as IndexFile;
    return {
      chunks: data.chunks.length,
      files: new Set(data.chunks.map((c) => c.file)).size,
      root: data.root,
    };
  } catch {
    return null;
  }
}
