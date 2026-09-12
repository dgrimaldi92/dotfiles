import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createWebSearchTool } from "./search/api/websearch";
import { logShutDown, logStartup } from "./shared/logger";

export default function webToolsExtension(pi: ExtensionAPI) {
  // Startup: ensure log dir exists and register process-level signal handlers
  pi.on("session_start", (_, ctx: ExtensionContext) => {
    const cwd = ctx.cwd.replace(/\//g, "-"); // e.g. "/home/dav/Documents/pi-web-tools"
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    logStartup(cwd, timestamp);
  });

  // Shutdown: remove process-level signal handlers
  pi.on("session_shutdown", () => {
    logShutDown();
  });
  pi.registerTool(createWebSearchTool());

  // pi.registerCommand("websearch", {
  //   description: "Enable or disable web search",
  //   handler: async (arg: string, ctx) => {
  //     const active = pi.getActiveTools();
  //     if (arg === "disable") {
  //       pi.setActiveTools(active.filter((t) => t !== "websearch"));
  //       ctx.ui.notify("Web search disabled", "info");
  //     } else if (arg === "enable") {
  //       pi.setActiveTools([...active, "websearch"]);
  //       ctx.ui.notify("Web search enabled", "info");
  //     } else {
  //       const isOn = active.includes("websearch");
  //       ctx.ui.notify(`Web search: ${isOn ? "enabled" : "disabled"}`, "info");
  //     }
  //   },
  // });
}
