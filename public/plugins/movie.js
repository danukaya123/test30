// movie.js - Direct WhatsApp Streaming
const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== VERCEL CONFIG ==========
const VERCEL_URL = 'https://test5689.vercel.app';

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

// ========== MEMORY MONITOR (LIGHTWEIGHT) ==========
class MemoryMonitor {
    constructor() {
        this.startTime = null;
    }

    formatMemory(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    }

    start(operation) {
        this.startTime = Date.now();
        const mem = process.memoryUsage();
        console.log(`\n\x1b[36m[🎬 START] ${operation} | Memory: ${this.formatMemory(mem.rss)}MB\x1b[0m`);
    }

    stop(operation) {
        const elapsed = Date.now() - this.startTime;
        const mem = process.memoryUsage();
        console.log(`\x1b[32m[✅ DONE] ${operation} | Time: ${elapsed}ms | Memory: ${this.formatMemory(mem.rss)}MB\x1b[0m`);
    }
}

const memMonitor = new MemoryMonitor();

// ---------- Helper Functions ----------
function normalizeQuality(text) {
  if (!text) return null;
  text = text.toUpperCase();
  if (/1080|FHD/.test(text)) return "1080p";
  if (/720|HD/.test(text)) return "720p";
  if (/480|SD/.test(text)) return "480p";
  return text;
}

function getDirectPixeldrainUrl(url) {
  const match = url.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://pixeldrain.com/api/file/${match[1]}?download`;
}

// ---------- Direct WhatsApp Streaming ----------
async function streamToWhatsAppDirectly(
  danuwa,
  from,
  pixeldrainUrl,
  fileName,
  caption,
  quoted
) {
  console.log(`🚀 Direct WhatsApp Streaming: ${fileName}`);

  try {
    /* ================= PIXELDRAIN FIX ================= */
    // Convert pixeldrain PAGE url → REAL file stream url
    const directPixeldrainUrl = getDirectPixeldrainUrl(pixeldrainUrl);

    if (!directPixeldrainUrl) {
      throw new Error("Invalid Pixeldrain URL");
    }

    /* ================= VERCEL STREAM URL ================= */
    const vercelStreamUrl =
      `${VERCEL_URL}/api/stream` +
      `?url=${encodeURIComponent(directPixeldrainUrl)}` +
      `&filename=${encodeURIComponent(fileName)}`;

    console.log(`🌐 Vercel → WhatsApp Stream URL:\n${vercelStreamUrl}`);

    /* ================= SEND TO WHATSAPP ================= */
    const result = await danuwa.sendMessage(
      from,
      {
        document: { url: vercelStreamUrl },
        mimetype: "video/mp4",
        fileName: fileName,
        caption:
          caption +
          `\n\n⚡ Direct Vercel → WhatsApp Stream` +
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

    console.log("✅ WhatsApp streaming initiated successfully");
    return result;

  } catch (error) {
    console.error("❌ WhatsApp streaming failed:", error.message);

    /* ================= FALLBACK ================= */
    const fallbackUrl = getDirectPixeldrainUrl(pixeldrainUrl);

    await danuwa.sendMessage(
      from,
      {
        text:
          `*⚠️ Streaming failed*\n\n` +
          `*🎬 File:* ${fileName}\n` +
          `*🔗 Direct Download:*\n${fallbackUrl}\n\n` +
          `*📥 Open in browser to download*`
      },
      { quoted }
    );

    throw error;
  }
}

// ---------- Search Functions ----------
async function searchMovies(query) {
  const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    const results = [];
    
    $(".display-item .item-box").slice(0, 8).each((index, box) => {
      const $box = $(box);
      const a = $box.find("a");
      const img = $box.find(".thumb");
      const lang = $box.find(".item-desc-giha .language").text() || "";
      const quality = $box.find(".item-desc-giha .quality").text() || "";
      
      if (a.attr("href") && a.attr("title")) {
        results.push({
          id: index + 1,
          title: a.attr("title").trim(),
          movieUrl: a.attr("href"),
          thumb: img.attr("src") || "",
          language: lang.trim(),
          quality: quality.trim()
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error("Search error:", error.message);
    return [];
  }
}

async function getMovieMetadata(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    
    const title = $(".info-details .details-title h3").text().trim() || "Unknown";
    const thumbnail = $(".splash-bg img").attr("src") || "";
    
    return { title, thumbnail };
  } catch (error) {
    console.error("Metadata error:", error.message);
    return { title: "Unknown", thumbnail: "" };
  }
}

async function getPixeldrainLinks(movieUrl) {
  try {
    const { data } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    const rows = [];
    
    $(".link-pixeldrain tbody tr").slice(0, 3).each((i, tr) => {
      const $tr = $(tr);
      const a = $tr.find(".link-opt a");
      const quality = $tr.find(".quality").text().trim() || "";
      const size = $tr.find("td:nth-child(3) span").text().trim() || "";
      
      if (a.attr("href")) {
        rows.push({
          pageLink: a.attr("href"),
          quality,
          size
        });
      }
    });
    
    const links = [];
    
    for (const l of rows) {
      try {
        const { data: pageData } = await axios.get(l.pageLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': movieUrl
          },
          timeout: 10000
        });
        
        const $$ = cheerio.load(pageData);
        const finalUrl = $$(".wait-done a[href^='https://pixeldrain.com/']").attr("href");
        
        if (finalUrl) {
          let sizeMB = 0;
          const sizeText = l.size.toUpperCase();
          if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
          else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
          
          if (sizeMB <= 2048) {
            links.push({ 
              link: finalUrl, 
              quality: normalizeQuality(l.quality), 
              size: l.size 
            });
          }
        }
      } catch (error) {
        console.error("Link processing error:", error.message);
      }
    }
    
    return links;
  } catch (error) {
    console.error("Pixeldrain links error:", error.message);
    return [];
  }
}

// ================= MAIN COMMANDS =================

/* ================= MOVIE SEARCH ================= */
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema"],
  react: "🎬",
  desc: "Search SinhalaSub movies",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  memMonitor.start(`Search: ${q}`);
  
  if (!q) {
    return reply(`*🎬 Vercel Direct Streaming*\n\nUsage: .movie name\nExample: .movie avatar\n\n*Features:*\n• Direct Vercel → WhatsApp\n• Zero bot memory usage\n• No file buffering`);
  }

  const searchResults = await searchMovies(q);
  if (!searchResults.length) {
    memMonitor.stop(`Search: ${q} - No results`);
    return reply("*❌ No movies found!*");
  }

  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

  if (config.BUTTON) {
    const rows = searchResults.map((movie, i) => ({
      id: `${i+1}`,
      title: movie.title,
      description: `${movie.language} | ${movie.quality}`
    }));

    const interactiveButtons = [{
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Movie Search Results",
        sections: [{ title: `Found ${searchResults.length} movies`, rows }]
      })
    }];

    const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 DIRECT WHATSAPP STREAMING 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 CHOOSE YOUR MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
┃ 🚀 *Vercel → WhatsApp Direct*  
┃ 💾 *Zero bot memory usage*  
┗━━━━━━━━━━━━━━━━━━━━━━┛`;
    
    await danuwa.sendMessage(from, { image: { url: imageUrl } }, { quoted: mek });
    await sendInteractiveMessage(danuwa, from, { text: caption, interactiveButtons, quoted: mek });

  } else {
    let filmListMessage = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 DIRECT WHATSAPP STREAMING 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 CHOOSE YOUR MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
┃ 🚀 *Vercel → WhatsApp Direct*  
┃ 💾 *Zero bot memory usage*  
┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

    searchResults.forEach((movie, index) => {
      filmListMessage += `${index + 1}. *${movie.title}*\n`;
      filmListMessage += `   📁 ${movie.quality} | 🎭 ${movie.language}\n\n`;
    });

    filmListMessage += `*📝 Reply with number (1-${searchResults.length})*`;

    await danuwa.sendMessage(from, {
      image: { url: imageUrl },
      caption: filmListMessage
    }, { quoted: mek });
  }
  
  memMonitor.stop(`Search: ${q}`);
});

/* ================= MOVIE SELECTION ================= */
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  memMonitor.start(`Movie Selection`);

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];

  await reply("*📥 Getting movie details...*");
  
  const metadata = await getMovieMetadata(selected.movieUrl);
  const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
  
  if (!downloadLinks.length) {
    memMonitor.stop(`Movie Selection - No links`);
    return reply("*❌ No download links found (<2GB)!*");
  }

  pendingQuality[sender] = { 
    movie: { 
      title: metadata.title,
      downloadLinks 
    }, 
    timestamp: Date.now() 
  };

  if (config.BUTTON) {
    const buttons = downloadLinks.map((d, i) => ({ 
      id: `${i+1}`, 
      text: `🎬 ${d.quality} (${d.size})` 
    }));
    
    await sendButtons(danuwa, from, { 
      text: `*🎬 ${metadata.title}*\n\n*Choose quality:*\n*🚀 Direct Vercel → WhatsApp Streaming*`, 
      buttons 
    }, { quoted: mek });
  } else {
    let text = `*🎬 ${metadata.title}*\n*Choose quality:*\n\n`;
    downloadLinks.forEach((d, i) => {
      text += `${i+1}. *${d.quality}* (${d.size})\n`;
    });
    text += `\n*📝 Reply with number (1-${downloadLinks.length})*`;
    reply(text);
  }
  
  memMonitor.stop(`Movie Selection`);
});

/* ================= QUALITY SELECTION & DIRECT STREAMING ================= */
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  memMonitor.start(`Direct WhatsApp Streaming`);

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  
  await reply(`*🚀 Starting DIRECT Vercel → WhatsApp streaming...*\n\n` +
              `*Quality:* ${selectedLink.quality}\n` +
              `*Size:* ${selectedLink.size}\n` +
              `*Method:* Zero-memory direct stream\n` +
              `*Please wait...*`);

  try {
    const safeFileName = `${movie.title.substring(0, 40)} - ${selectedLink.quality}.mp4`
      .replace(/[^\w\s.-]/gi, '')
      .trim();
    
    const caption = `*🎬 ${movie.title}*\n` +
                    `*📊 ${selectedLink.quality} | ${selectedLink.size}*\n` +
                    `*🚀 Direct Vercel → WhatsApp Stream*\n` +
                    `*💾 Zero bot memory usage*`;
    
    // THIS IS THE KEY: Direct streaming, no bot memory
await streamToWhatsAppDirectly(
  danuwa,
  from,
  selectedLink.link, // page link → converted internally
  safeFileName,
  caption,
  mek
);
    
    console.log(`✅ Direct streaming completed`);
    
  } catch (error) {
    console.error(`❌ Streaming error:`, error);
    await reply(`*❌ Streaming failed:* ${error.message}`);
  }
  
  memMonitor.stop(`Direct WhatsApp Streaming`);
});

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000;
  
  for (const s in pendingSearch) {
    if (now - pendingSearch[s].timestamp > timeout) {
      delete pendingSearch[s];
    }
  }
  
  for (const s in pendingQuality) {
    if (now - pendingQuality[s].timestamp > timeout) {
      delete pendingQuality[s];
    }
  }
}, 5 * 60 * 1000);

module.exports = { pendingSearch, pendingQuality, VERCEL_URL };
