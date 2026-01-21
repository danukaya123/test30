/* ==========================
   🔍 SEARCH CATEGORY (NO API)
========================== */
const { cmd } = require("../command"); // Ensure path is correct
const axios = require("axios");
const cheerio = require("cheerio");

const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';

// Helper to decode DuckDuckGo links
function cleanDuckLink(link) {
  try {
    const url = new URL("https://duckduckgo.com" + link);
    return decodeURIComponent(url.searchParams.get("uddg"));
  } catch {
    return link;
  }
}

// ==========================
// 🔹 GOOGLE SEARCH
// ==========================
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
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    const results = [];

    $(".result").each((i, el) => {
      if (i >= 5) return;
      const title = $(el).find(".result__a").text().trim();
      const link = $(el).find(".result__a").attr("href");
      const snippet = $(el).find(".result__snippet").text().trim();
      if (title && link) results.push({ title, link, snippet });
    });

    if (!results.length) return reply("❌ No results found.");

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
      const snippet = r.snippet ? r.snippet.substring(0, 120) + "..." : "No description.";
      text += `
╭─ 📌 *RESULT ${i + 1}*
│ 📰 *Title:* ${r.title}
│ 📝 *Info:* ${snippet}
│ 🌐 *Link:* ${cleanLink}
╰───────────────⬣
`;
    });

    text += `
⚙️ Made with ❤️ by
╰🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥`;

    await danuwa.sendMessage(from, {
      text,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1
        }
      }
    }, { quoted: mek });

  } catch (e) {
    console.error("Google Search error:", e);
    reply("❌ Search failed.");
  }
});

// ==========================
// 🔹 WIKIPEDIA SEARCH
// ==========================
cmd({
  pattern: "wiki",
  react: "📚",
  desc: "Search Wikipedia",
  category: "search",
  filename: __filename
}, async (danuwa, mek, m, { from, q, reply }) => {
  if (!q) return reply("📚 Use `.wiki <topic>`");
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(q.replace(/ /g, "_"))}`;
  const text = `
╭─────── ⭓ ⭓ ⭓ ─────────╮
│        📚 WIKIPEDIA SEARCH 📚       │
╰──────────────⟡───────╯
│ 🔎 *Query:* ${q}
│ 🌐 *Link:* ${wikiUrl}
╰───────────────⬣
⚙️ Made with ❤️ by
╰🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥`;
  await danuwa.sendMessage(from, { text, contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: channelName,
            serverMessageId: -1
        }
      } }, { quoted: mek });
});

// ==========================
// 🔹 NEWS SEARCH
// ==========================
cmd({
  pattern: "news",
  react: "📰",
  desc: "Search News (DuckDuckGo)",
  category: "search",
  filename: __filename
}, async (danuwa, mek, m, { from, q, reply }) => {
  if (!q) return reply("📰 Use `.news <query>`");
  await reply("📰 Searching news...");

  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}&t=h_&ia=news`;
    const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(data);
    const results = [];

    $(".result").each((i, el) => {
      if (i >= 5) return;
      const title = $(el).find(".result__a").text().trim();
      const link = $(el).find(".result__a").attr("href");
      const snippet = $(el).find(".result__snippet").text().trim();
      if (title && link) results.push({ title, link, snippet });
    });

    if (!results.length) return reply("❌ No news found.");

    let text = `
╭─────── ⭓ ⭓ ⭓ ─────────╮
│        📰 NEWS SEARCH 📰       │
╰──────────────⟡───────╯
│ 🔎 *Query:* ${q}
│ 📊 *Results:* ${results.length}
╰───────────────⬣
`;

    results.forEach((r, i) => {
      const cleanLink = cleanDuckLink(r.link);
      const snippet = r.snippet ? r.snippet.substring(0, 120) + "..." : "No description.";
      text += `
╭─ 📌 *NEWS ${i + 1}*
│ 📰 *Title:* ${r.title}
│ 📝 *Info:* ${snippet}
│ 🌐 *Link:* ${cleanLink}
╰───────────────⬣
`;
    });

    text += `
⚙️ Made with ❤️ by
╰🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥`;

    await danuwa.sendMessage(from, { text, contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: channelName,
            serverMessageId: -1
        }
      } }, { quoted: mek });

  } catch (e) {
    console.error("News Search error:", e);
    reply("❌ News search failed.");
  }
});

/* ==========================
   🖼️ IMAGE SEARCH (NO API)
========================== */
cmd({
  pattern: "image",
  react: "🖼️",
  desc: "Search images on the web (no API)",
  category: "search",
  filename: __filename
}, async (danuwa, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("🖼️ Use `.image <search query>`");

    await reply("🖼️ Searching for images...");

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}&iax=images&ia=images`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const results = [];

    $(".tile--img").each((i, el) => {
      if (i >= 5) return; // top 5 images
      const img = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
      const title = $(el).find("img").attr("alt") || "No description";
      if (img) results.push({ img, title });
    });

    if (!results.length) return reply("❌ No images found.");

    // send each image
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      await danuwa.sendMessage(from, {
        image: { url: r.img },
        caption: `
╭─ 🖼️ IMAGE RESULT ${i + 1}
│ 📝 *Title:* ${r.title}
│ 🔎 *Query:* ${q}
╰───────────────⬣`
      }, { quoted: mek });
    }

  } catch (e) {
    console.error("No-API Image search error:", e);
    reply("❌ Image search failed.");
  }
});

