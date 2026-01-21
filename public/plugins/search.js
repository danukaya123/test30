/* ==========================
   🔍 GOOGLE SEARCH (NO API)
========================== */
const axios = require("axios");
const cheerio = require("cheerio");

cmd({
  pattern: "google",
  react: "🔍",
  desc: "Search the web (no API)",
  category: "search",
  filename: __filename
}, async (danuwa, mek, m, { from, q, reply }) => {
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
      if (i >= 5) return;

      const title = $(el).find(".result__a").text();
      const link = $(el).find(".result__a").attr("href");
      const snippet = $(el).find(".result__snippet").text();

      if (title && link) {
        results.push({ title, link, snippet });
      }
    });

    if (results.length === 0) {
      return reply("❌ No results found.");
    }

    let text = `🔍 *Search Results*\n\n`;

    results.forEach((r, i) => {
      text += `*${i + 1}. ${r.title}*\n`;
      if (r.snippet) text += `${r.snippet}\n`;
      text += `${r.link}\n\n`;
    });

    reply(text);

  } catch (e) {
    console.error("No-API Google error:", e);
    reply("❌ Search failed.");
  }
});
