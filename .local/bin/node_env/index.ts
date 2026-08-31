import { Command } from "commander";
import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

const program = new Command();

const query = "python";
// const url =
// ("https://www.reddit.com/r/sfoghi/comments/1w1ug22/til_le_mutande_in_solo_cotone_sono_diventate_un/");
const url = `https://www.google.com/search?q="${encodeURIComponent(query)}"`;
const response = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept: "text/html;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
  },
});

const htmlString = await response.text();
const { document } = parseHTML(htmlString);
const result = await Defuddle(document, url, {
  markdown: true,
});

console.log(result);
