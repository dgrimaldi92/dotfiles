# dgrimaldi-web-search Extension

A web search extension for the pi coding agent that allows the LLM to perform live web searches to get up-to-date information from the internet.

## Installation

This extension is already installed in your global extensions directory (`~/.pi/agent/extensions/dgrimaldi-web-search`).

### 1. Configuration (Highly Recommended)

By default, this extension runs in **Mock Mode** so it won't fail immediately. To enable real web searching, you need to provide an API key for a search provider (the implementation uses [Tavily](https://tavily.com/) by default).

1. Get a free API key from [Tavily AI](https://tavily.com/).
2. Add the following environment variable to your shell configuration file (`~/.bashrc` or `~/.zshrc`):

```bash
export DGRIMALDI_SEARCH_API_KEY="your_tavily_api_key_here"
```

3. Restart your terminal (or source your config).

### 2. Usage

Once installed, you can simply ask the agent to search for something:

- "Search the web for recent news about SpaceX."
- "What is the current price of Bitcoin?"

The agent will use the `dgrimaldi_web_search` tool automatically when it determines a search is necessary.

## 🏗️ Architecture Reference (Inspiration)

This extension is modeled after the professional structure used in the `pi-web-tools` repository. If you wish to expand this into a full-scale implementation, here is how the files are categorized by their "job":

### 1. The Orchestrator (The "Boss")
*   **`websearch.ts`**: Defines the actual tool command, its description, parameters, and how results are rendered on your screen.

### 2. The Logic Layer (The "Brain")
*   **`search-web.ts`**: Coordinates between the user's settings and the actual search engine being used.
*   **`websearch-input.ts`**: Validates that search queries are clean and valid before they are sent to the internet.

### 3. The Drivers (The "Workers")
*Found in the `providers/` directory.*
*   **`providers/types.ts`**: The rulebook that ensures all different search engines (Google, Exa, etc.) behave the same way for Pi.
*   **`providers/exa.ts`**: A specific driver containing instructions on how to talk to a single provider like Exa.

### 4. The Foundation (The "Rules")
*   **`types.ts`**: Defines shared concepts like "Search Depth" or "Provider Names."
*   **`result.ts`**: Handles the logic of returning either a success with data OR an error message.
*   **`network.ts`**: Manages low-level internet tasks like timeouts and connection failures.

## Development

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Running with local changes
If you want to modify and test this extension without installing it globally, you can use the `-e` flag:

```bash
pi -e ./path/to/your/extension/src/index.ts
```
