import { Result } from "@/shared/result";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolOutputStoreError } from "@/search/presentation/agent-view";
import type { SearchDepth, SearchProviderName, SearchQuery } from "./types";

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
