import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createWebSearchTool } from "@/search/api/websearch";

export default function webToolsExtension(pi: ExtensionAPI) {
  pi.registerTool(createWebSearchTool());
}
