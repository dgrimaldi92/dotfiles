import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

/**
 * --------------------------------------------------------------------------
 * TYPES & INTERFACES
 * --------------------------------------------------------------------------
 */

export interface NormalizedSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: NormalizedSearchResult[];
  provider: string;
}

type ExtensionError = 
  | { _tag: "ProviderError"; message: string }
  | { _tag: "TimeoutError" };

type Result<T, E> = { _tag: "ok"; value: T } | { _tag: "err"; error: E };

/**
 * --------------------------------------------------------------------------
 * PROVIDER LAYER (The Workers)
 * --------------------------------------------------------------------------
 */

interface SearchProvider {
  readonly name: string;
  search(query: string, maxResults: number, signal?: AbortSignal): Promise<Result<SearchResponse, ExtensionError>>;
}

class TavilyProvider implements SearchProvider {
  readonly name = "tavily";
  constructor(private readonly apiKey: string) {}
  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<Result<SearchResponse, ExtensionError>> {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: this.apiKey, query, max_results: maxResults }),
        signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { _tag: "ok", value: { provider: this.name, results: (data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content || r.snippet })) } };
    } catch (e: any) { return { _tag: "err", error: { _tag: "ProviderError", message: e.message } }; }
  }
}

class ExaProvider implements SearchProvider {
  readonly name = "exa";
  constructor(private readonly apiKey: string) {}
  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<Result<SearchResponse, ExtensionError>> {
    try {
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
        body: JSON.stringify({ query, num_results: maxResults }),
        signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { _tag: "ok", value: { provider: this.name, results: (data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.description || "" })) } };
    } catch (e: any) { return { _tag: "err", error: { _tag: "ProviderError", message: e.message } }; }
  }
}

class SearXNGProvider implements SearchProvider {
  readonly name = "searxng";
  constructor(private readonly baseUrl: string) {}
  async search(query: string, maxResults: number, signal?: AbortSignal): Promise<Result<SearchResponse, ExtensionError>> {
    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.append("q", query);
      url.searchParams.append("format", "json");
      url.searchParams.append("engines", "google,bing,duckduckgo");

      const response = await fetch(url.toString(), { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { _tag: "ok", value: { provider: this.name, results: (data.results || []).slice(0, maxResults).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content || "" })) } };
    } catch (e: any) { return { _tag: "err", error: { _tag: "ProviderError", message: e.message } }; }
  }
}

class MockProvider implements SearchProvider {
  readonly name = "mock";
  async search(query: string): Promise<Result<SearchResponse, ExtensionError>> {
    return { _tag: "ok", value: { provider: this.name, results: [{ title: `[MOCK] ${query}`, url: "#", snippet: "This is a simulated result for testing." }] } };
  }
}

/**
 * --------------------------------------------------------------------------
 * MAIN EXTENSION (The Orchestrator)
 * --------------------------------------------------------------------------
 */

export default function (pi: ExtensionAPI) {
  // Configuration via Environment Variables
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const EXA_KEY = process.env.EXA_API_KEY;
  const SEARX_URL = process.env.SEARXNG_URL || "https://searx.be/api";

  // Initialize Providers
  const providers: Record<string, SearchProvider> = {
    tavily: TAVILY_KEY ? new TavilyProvider(TAVILY_KEY) : new MockProvider(),
    exa: EXA_KEY ? new ExaProvider(EXA_KEY) : new MockProvider(),
    searxng: new SearXNGProvider(SEARX_URL),
  };

  /**
   * TOOL REGISTRATION (The "Limbs")
   */
  const registerSearchTool = (key: string, label: string, description: string) => {
    pi.registerTool({
      name: `search_${key}`,
      label: label,
      description: `${description} Use this tool if it matches your intent.`,
      parameters: Type.Object({
        query: Type.String({ description: "The search query." }),
        maxResults: Type.Optional(Type.Number({ default: 3, minimum: 1, maximum: 10 })),
      }),
      async execute(_id, params, signal, onUpdate) {
        const provider = providers[key];

        // Notify user of progress using the onUpdate callback (per guidelines)
        onUpdate?.({
          content: [{ type: "text", text: `🚀 Running ${label} search for "${params.query}"...` }],
          details: { provider: provider.name, query: params.query } as any,
        });

        const result = await provider.search(params.query, params.maxResults, signal);

        if (result._tag === "err") {
          return { 
            content: [{ type: "text", text: `❌ ${label} Error: ${result.error.message}` }], 
            isError: true 
          };
        }

        const data = result.value;
        return {
          content: data.results.map(r => ({
            type: "text" as const,
            text: `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`,
          })),
          details: { provider: data.provider, total: data.results.length } as any,
        };
      },
    });
  };

  registerSearchTool("tavily", "Tavily Search", "Best for general facts and news.");
  registerSearchTool("exa", "Exa Semantic Search", "Best for deep research or technical papers.");
  registerSearchTool("searxng", "SearXNG Web Search", "Broad search across many engines.");

  /**
   * SKILL IMPLEMENTATION (The "Brain")
   */
  pi.on("before_agent_start", async (_event, ctx) => {
    return {};
  });

  /**
   * COMMANDS & UI (User Interaction)
   */
  pi.registerCommand("search-config", {
    description: "Check which search providers are active (Real vs Mock mode)",
    handler: async (_args, ctx) => {
      let report = "🔍 **Web Search Configuration Status:**\n\n";
      report += `• Tavily: ${providers.tavily instanceof MockProvider ? "⚠️ [MOCK MODE]" : "✅ [ACTIVE]"}\n`;
      report += `• Exa: ${providers.exa instanceof MockProvider ? "⚠️ [MOCK MODE]" : "✅ [ACTIVE]"}\n`;
      report += `• SearXNG: ✅ [ACTIVE] (${SEARX_URL})\n\n`;
      report += "_Tip: To enable real searches, add your API keys to your environment variables.";

      await ctx.sendUserMessage(report);
    },
  });

  pi.on("session_start", (event, ctx) => {
    if (!TAVILY_KEY && !EXA_KEY) {
      ctx.ui.notify("Web Search: Using Mock Mode (No API keys detected)", "warning");
    } else {
      ctx.ui.notify("Web Search: All specialized tools ready", "info");
    }
  });

  pi.on("session_shutdown", async () => {
    // Cleanup logic would go here if we had active connections/timers
  });
}
