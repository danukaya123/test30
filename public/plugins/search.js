/* ==========================
   🔍 GOOGLE SEARCH (NO API)
========================== */
const { cmd } = require("../command"); // Make sure this path is correct
const axios = require("axios");
const cheerio = require("cheerio");

// Helper to decode DuckDuckGo links
function cleanDuckLink(link) {
  try {
    const url = new URL("https://duckduckgo.com" + link);
    return decodeURIComponent(url.searchParams.get("uddg"));
  } catch {
    return link;
  }
}

cmd({
  pattern: "google",
  react: "🔍",
  desc: "Search the web (no API)",
  category: "search",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  try {
    if (!q) return reply("🔍 Use `.google <search query>`");

    await reply("🔍 Searching the web...");

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const results = [];

    $(".result").each((i, el) => {
      if (i >= 5) return; // limit top 5 results

      const title = $(el).find(".result__a").text().trim();
      const link = $(el).find(".result__a").attr("href");
      const snippet = $(el).find(".result__snippet").text().trim();

      if (title && link) {
        results.push({ title, link, snippet });
      }
    });

    if (results.length === 0) {
      return reply("❌ No results found.");
    }

    // Professional DANUWA-style output
    let text = `
╭─────── ⭓ ⭓ ⭓ ─────────╮
│        🔍 GOOGLE SEARCH 🔍        │
╰──────────────⟡───────╯
│ 🔎 *Query:* ${q}
│ 📊 *Results:* ${results.length}
╰───────────────⬣
`;

    results.forEach((r, i) => {
      const cleanLink = cleanDuckLink(r.link);
      const snippet = r.snippet
        ? r.snippet.substring(0, 120) + "..."
        : "No description available.";

      text += `
╭─ 📌 *RESULT ${i + 1}*
│ 📰 *Title:* ${r.title}
│ 📝 *Info:* ${snippet}
│ 🌐 *Link:* ${cleanLink}
╰───────────────⬣
`;
    });

    text += `
⚙️ Powered by 🌀 DANUWA-MD 🌀
🔥 Web Search Engine
`;

    reply(text);

  } catch (e) {
    console.error("No-API Google error:", e);
    reply("❌ Search failed.");
  }
});
