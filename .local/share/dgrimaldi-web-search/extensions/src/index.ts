import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createWebSearchTool } from "./tools/websearch.ts";

export default function webToolsExtension(pi: ExtensionAPI) {
  pi.registerTool(createWebSearchTool());
}
