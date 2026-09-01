import { Result } from "@/shared/result";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolOutputStoreError } from "@/search/presentation/agent-view";
import type { NormalizedSearchResult, SearchDepth, SearchProviderName, SearchQuery } from "./types";

export async function writeTempTextFile(
  prefix: string,
  fileName: string,
  content: string,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  const outputPath = join(dir, fileName);
  await writeFile(outputPath, content, "utf8");
  return outputPath;
}

export interface ToolOutputStore {
  writeTextFile(
    prefix: string,
    fileName: string,
    content: string,
  ): Promise<Result<string, ToolOutputStoreError>>;
}

export interface SearchProviderRequest {
  readonly query: SearchQuery;
  readonly maxResults: number;
  readonly depth: SearchDepth;
}

export type SearchProviderError =
  | {
      readonly _tag: "SearchProviderUnavailable";
      readonly provider: SearchProviderName;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "SearchProviderStatusRejected";
      readonly provider: SearchProviderName;
      readonly status: number;
    }
  | {
      readonly _tag: "SearchProviderResponseTooLarge";
      readonly provider: SearchProviderName;
      readonly maxBytes: number;
    }
  | {
      readonly _tag: "SearchProviderProtocolInvalid";
      readonly provider: SearchProviderName;
      readonly reason: string;
    }
  | {
      readonly _tag: "SearchProviderReturnedError";
      readonly provider: SearchProviderName;
      readonly safeMessage: string;
    }
  | { readonly _tag: "SearchProviderNoRecognizedResults"; readonly provider: SearchProviderName }
  | {
      readonly _tag: "SearchProviderCancelled";
      readonly provider: SearchProviderName;
      readonly cause?: unknown;
    }
  | { readonly _tag: "SearchTimedOut"; readonly afterSeconds: number };

export interface SearchProvider {
  readonly name: SearchProviderName;

  search(
    input: SearchProviderRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Result<readonly NormalizedSearchResult[], SearchProviderError>>;
}

export type SearchRequest = SearchProviderRequest;
