// movie.js - Direct Pixeldrain → WhatsApp Streaming (STABLE)
const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

/* ================= STATE ================= */
const pendingSearch = {};
const pendingQuality = {};
const channelJid = "120363418166326365@newsletter";
const channelName = "🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁";
const imageUrl =
  "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

/* ================= MEMORY MONITOR ================= */
class MemoryMonitor {
  constructor() {
    this.startTime = null;
  }
  format(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
  }
  start(op) {
    this.startTime = Date.now();
    const m = process.memoryUsage();
    console.log(
      `\n\x1b[36m[🎬 START] ${op} | Memory: ${this.format(m.rss)}MB\x1b[0m`
    );
  }
  stop(op) {
    const m = process.memoryUsage();
    console.log(
      `\x1b[32m[✅ DONE] ${op} | ${Date.now() -
        this.startTime}ms | Memory: ${this.format(m.rss)}MB\x1b[0m`
    );
  }
}
const memMonitor = new MemoryMonitor();

/* ================= HELPERS ================= */
function normalizeQuality(text = "") {
  text = text.toUpperCase();
  if (/1080|FHD/.test(text)) return "1080p";
  if (/720|HD/.test(text)) return "720p";
  if (/480|SD/.test(text)) return "480p";
  return text;
}

function pixeldrainApi(url) {
  const id = url.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/)?.[1];
  return id ? `https://pixeldrain.com/api/file/${id}` : null;
}

/* ================= DIRECT STREAM ================= */
async function streamToWhatsAppDirectly(
  danuwa,
  from,
  pixeldrainPageUrl,
  fileName,
  caption,
  quoted
) {
  const apiUrl = pixeldrainApi(pixeldrainPageUrl);
  if (!apiUrl) throw new Error("Invalid Pixeldrain URL");

  console.log("🚀 Pixeldrain → WhatsApp:", apiUrl);

  return await danuwa.sendMessage(
    from,
    {
      document: { url: apiUrl },
      mimetype: "video/mp4",
      fileName,
      caption:
        caption +
        `\n\n⚡ Direct Pixeldrain → WhatsApp Stream` +
        `\n💾 Zero bot memory usage`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1
        }
      }
    },
    { quoted }
  );
}

/* ================= SEARCH ================= */
async function searchMovies(query) {
  const { data } = await axios.get(
    `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const $ = cheerio.load(data);
  const out = [];

  $(".display-item .item-box")
    .slice(0, 8)
    .each((i, el) => {
      const a = $(el).find("a");
      out.push({
        id: i + 1,
        title: a.attr("title"),
        movieUrl: a.attr("href"),
        quality: $(el).find(".quality").text(),
        language: $(el).find(".language").text()
      });
    });

  return out;
}

async function getMovieMetadata(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  return {
    title: $(".details-title h3").text().trim() || "Unknown"
  };
}

async function getPixeldrainLinks(movieUrl) {
  const { data } = await axios.get(movieUrl, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const links = [];

  $(".link-pixeldrain tbody tr")
    .slice(0, 3)
    .each((_, tr) => {
      const page = $(tr).find("a").attr("href");
      const quality = normalizeQuality($(tr).find(".quality").text());
      const size = $(tr).find("td:nth-child(3)").text().trim();
      if (page) links.push({ link: page, quality, size });
    });

  return links;
}

/* ================= MOVIE SEARCH ================= */
cmd(
  {
    pattern: "movie",
    alias: ["sinhalasub", "films", "cinema"],
    react: "🎬",
    category: "download",
    filename: __filename
  },
  async (danuwa, mek, m, { from, q, sender, reply }) => {
    memMonitor.start(`Search: ${q}`);

    if (!q)
      return reply(
        `*🎬 Direct Pixeldrain Streaming*\n\nUsage: .movie avatar\n\n• Zero memory\n• No proxy\n• Stable`
      );

    const results = await searchMovies(q);
    if (!results.length) return reply("*❌ No movies found!*");

    pendingSearch[sender] = { results, timestamp: Date.now() };

    const rows = results.map((m, i) => ({
      id: String(i + 1),
      title: m.title,
      description: `${m.language} | ${m.quality}`
    }));

    await danuwa.sendMessage(from, { image: { url: imageUrl } }, { quoted: mek });

    await sendInteractiveMessage(danuwa, from, {
      text: `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
📂 DIRECT WHATSAPP STREAMING`,
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Movie Results",
            sections: [{ title: "Select Movie", rows }]
          })
        }
      ],
      quoted: mek
    });

    memMonitor.stop(`Search: ${q}`);
  }
);

/* ================= MOVIE SELECT ================= */
cmd(
  {
    filter: (t, { sender }) =>
      pendingSearch[sender] &&
      !isNaN(t) &&
      t > 0 &&
      t <= pendingSearch[sender].results.length
  },
  async (danuwa, mek, m, { body, sender, from, reply }) => {
    memMonitor.start("Movie Selection");

    const movie = pendingSearch[sender].results[body - 1];
    delete pendingSearch[sender];

    const meta = await getMovieMetadata(movie.movieUrl);
    const links = await getPixeldrainLinks(movie.movieUrl);

    pendingQuality[sender] = { movie: meta, links };

    await sendButtons(
      danuwa,
      from,
      {
        text: `*🎬 ${meta.title}*\n\nChoose quality`,
        buttons: links.map((l, i) => ({
          id: String(i + 1),
          text: `🎞 ${l.quality} (${l.size})`
        }))
      },
      { quoted: mek }
    );

    memMonitor.stop("Movie Selection");
  }
);

/* ================= QUALITY SELECT ================= */
cmd(
  {
    filter: (t, { sender }) =>
      pendingQuality[sender] &&
      !isNaN(t) &&
      t > 0 &&
      t <= pendingQuality[sender].links.length
  },
  async (danuwa, mek, m, { body, sender, from, reply }) => {
    memMonitor.start("Direct Streaming");

    const { movie, links } = pendingQuality[sender];
    delete pendingQuality[sender];

    const sel = links[body - 1];
    const fileName = `${movie.title} - ${sel.quality}.mp4`.replace(
      /[^\w\s.-]/g,
      ""
    );

    await reply("*🚀 Streaming to WhatsApp… Please wait*");

    await streamToWhatsAppDirectly(
      danuwa,
      from,
      sel.link,
      fileName,
      `*🎬 ${movie.title}*\n*📊 ${sel.quality} | ${sel.size}*`,
      mek
    );

    memMonitor.stop("Direct Streaming");
  }
);

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();
  for (const k in pendingSearch)
    if (now - pendingSearch[k].timestamp > 600000) delete pendingSearch[k];
  for (const k in pendingQuality)
    if (now - pendingQuality[k].timestamp > 600000) delete pendingQuality[k];
}, 300000);

module.exports = { pendingSearch, pendingQuality };
