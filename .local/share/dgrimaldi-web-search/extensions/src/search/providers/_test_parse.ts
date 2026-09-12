import { parseSearchText } from "./results";

// The fragment you pasted (a single JSON result object), as it appears in the log.
const s =
  '"url":"https://github.com/tavily-ai/tavily-python",' +
  '"title":"The Tavily Python SDK allows for easy interaction ...",' +
  '"content":"### Getting and printing the full Search API response\\n\\n```\\n...```",' +
  '"score":0.8452414,"raw_content":null,"id":"39e25a-00"';

console.log("starts with 'URL: '?:", s.startsWith("URL: "));
console.log("starts with '\"url\"'?:", s.startsWith('"url"'));
console.log("has REAL newlines?:", s.includes("\n"));
console.log("line count:", s.split("\n").length);

console.log("\nparseSearchText result:");
console.log(parseSearchText(s));
