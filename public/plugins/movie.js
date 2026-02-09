const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== CLOUDFLARE WORKER CONFIG ==========
// ⚠️ REPLACE THIS WITH YOUR ACTUAL WORKER URL ⚠️
const CLOUDFLARE_WORKER_URL = 'https://royal-brook-d5cd.educatelux1.workers.dev';
// Get this from your Cloudflare Workers dashboard
// ==============================================

// ========== MEMORY MONITOR (LIGHTWEIGHT) ==========
class MemoryMonitor {
    constructor(updateInterval = 500) {
        this.updateInterval = updateInterval;
        this.interval = null;
        this.isMonitoring = false;
        this.startTime = null;
    }

    formatMemory(bytes) {
        const mb = bytes / 1024 / 1024;
        return mb.toFixed(2);
    }

    showStats() {
        if (!this.isMonitoring) return;
        
        const mem = process.memoryUsage();
        const elapsed = Date.now() - this.startTime;
        const elapsedStr = elapsed < 1000 ? `${elapsed}ms` : `${(elapsed/1000).toFixed(1)}s`;
        
        console.log(`\x1b[36m[🎬 MOVIE] Time: ${elapsedStr} | RAM: ${this.formatMemory(mem.rss)}MB | Heap: ${this.formatMemory(mem.heapUsed)}MB\x1b[0m`);
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log('\x1b[42m\x1b[30m          🎬 DANUWA MOVIE + CLOUDFLARE STREAMING              \x1b[0m');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log(`\x1b[36m🌍 Cloudflare Worker: ${CLOUDFLARE_WORKER_URL}\x1b[0m`);
        console.log(`\x1b[36m💡 Streaming via Global CDN (Zero bot memory for files)\x1b[0m\n`);
        
        this.showStats();
        this.interval = setInterval(() => this.showStats(), this.updateInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        if (this.isMonitoring) {
            const mem = process.memoryUsage();
            console.log('\n\x1b[32m════════════════════════════════════════════════════\x1b[0m');
            console.log(`\x1b[32m✅ Streaming completed!\x1b[0m`);
            console.log(`\x1b[32m📊 Final RAM: ${this.formatMemory(mem.rss)}MB\x1b[0m`);
            console.log(`\x1b[32m💾 Heap: ${this.formatMemory(mem.heapUsed)}MB\x1b[0m`);
            console.log(`\x1b[32m🌍 Cloudflare handled all heavy lifting\x1b[0m`);
            console.log('\x1b[32m════════════════════════════════════════════════════\x1b[0m\n');
        }
        
        this.isMonitoring = false;
    }
}

const memoryMonitor = new MemoryMonitor();

// ---------- Cloudflare Streaming Function ----------
async function streamViaCloudflare(danuwa, from, pixeldrainUrl, fileName, caption, quoted) {
  console.log(`\x1b[36m🚀 Cloudflare Streaming Activated\x1b[0m`);
  console.log(`\x1b[36m📦 File: ${fileName}\x1b[0m`);
  
  try {
    // Encode parameters for Cloudflare Worker
    const encodedUrl = encodeURIComponent(pixeldrainUrl);
    const encodedName = encodeURIComponent(fileName);
    
    // Build Cloudflare Worker URL
    const cloudflareUrl = `${CLOUDFLARE_WORKER_URL}/?url=${encodedUrl}&filename=${encodedName}`;
    
    console.log(`\x1b[36m🌐 Cloudflare URL: ${cloudflareUrl}\x1b[0m`);
    console.log(`\x1b[33m⚡ Streaming via Cloudflare Global Network...\x1b[0m`);
    
    // Send to WhatsApp via Cloudflare
    const result = await danuwa.sendMessage(from, {
      document: { 
        url: cloudflareUrl  // WhatsApp downloads from Cloudflare
      },
      mimetype: "video/mp4",
      fileName: fileName,
      caption: caption + `\n\n⚡ Streamed via Cloudflare CDN\n🌍 Global Edge Network\n🔒 Zero Bot Memory Usage`,
      contextInfo: {       
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1
        }
      }
    }, { quoted: quoted });
    
    console.log(`\x1b[32m✅ Cloudflare streaming successful!\x1b[0m`);
    console.log(`\x1b[32m📊 WhatsApp is downloading from Cloudflare edge server\x1b[0m`);
    
    return result;
    
  } catch (error) {
    console.error(`\x1b[31m❌ Cloudflare streaming failed: ${error.message}\x1b[0m`);
    
    // Fallback: Try direct URL
    console.log(`\x1b[33m🔄 Falling back to direct URL...\x1b[0m`);
    
    try {
      const fallbackResult = await danuwa.sendMessage(from, {
        document: { 
          url: pixeldrainUrl  // Direct URL as fallback
        },
        mimetype: "video/mp4",
        fileName: fileName,
        caption: caption + `\n\n⚠️ Direct Download (Fallback Mode)`,
        contextInfo: {       
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: channelName,
            serverMessageId: -1
          }
        }
      }, { quoted: quoted });
      
      console.log(`\x1b[32m✅ Direct fallback successful\x1b[0m`);
      return fallbackResult;
      
    } catch (fallbackError) {
      console.error(`\x1b[31m❌ All streaming methods failed\x1b[0m`);
      throw new Error(`Streaming failed: ${error.message} | Fallback: ${fallbackError.message}`);
    }
  }
}

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

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
  const match = url.match(/pixeldrain\.com\/u\/(\w+)/);
  if (!match) return null;
  return `https://pixeldrain.com/api/file/${match[1]}?download`;
}

// ---------- Movie Search ----------
async function searchMovies(query) {
  console.log(`\x1b[34m🔍 Searching movies for: ${query}\x1b[0m`);
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
    
    $(".display-item .item-box").slice(0, 10).each((index, box) => {
      const $box = $(box);
      const a = $box.find("a");
      const img = $box.find(".thumb");
      const lang = $box.find(".item-desc-giha .language").text() || "";
      const quality = $box.find(".item-desc-giha .quality").text() || "";
      const qty = $box.find(".item-desc-giha .qty").text() || "";
      
      if (a.attr("href") && a.attr("title")) {
        results.push({
          id: index + 1,
          title: a.attr("title").trim(),
          movieUrl: a.attr("href"),
          thumb: img.attr("src") || "",
          language: lang.trim(),
          quality: quality.trim(),
          qty: qty.trim()
        });
      }
    });
    
    console.log(`\x1b[32m✅ Found ${results.length} movies\x1b[0m`);
    return results;
  } catch (error) {
    console.error(`\x1b[31m❌ Search error: ${error.message}\x1b[0m`);
    return [];
  }
}

// ---------- Movie Metadata ----------
async function getMovieMetadata(url) {
  console.log(`\x1b[34m📥 Fetching metadata...\x1b[0m`);
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    
    const title = $(".info-details .details-title h3").text().trim();
    let language = "";
    const directors = [];
    const stars = [];
    
    $(".info-col p").each((i, p) => {
      const $p = $(p);
      const strong = $p.find("strong");
      if (strong.length) {
        const txt = strong.text().trim();
        if (txt.includes("Language:")) {
          language = $(strong[0].nextSibling).text().trim();
        }
        if (txt.includes("Director:")) {
          $p.find("a").each((j, a) => {
            directors.push($(a).text().trim());
          });
        }
        if (txt.includes("Stars:")) {
          $p.find("a").each((j, a) => {
            stars.push($(a).text().trim());
          });
        }
      }
    });
    
    const duration = $(".data-views[itemprop='duration']").text().trim();
    const imdb = $(".data-imdb").text().replace("IMDb:", "").trim();
    
    const genres = [];
    $(".details-genre a").each((i, a) => {
      genres.push($(a).text().trim());
    });
    
    const thumbnail = $(".splash-bg img").attr("src") || "";
    
    console.log(`\x1b[32m✅ Metadata loaded: ${title}\x1b[0m`);
    return {
      title,
      language,
      duration,
      imdb,
      genres,
      directors,
      stars,
      thumbnail
    };
  } catch (error) {
    console.error(`\x1b[31m❌ Metadata error: ${error.message}\x1b[0m`);
    return {
      title: "",
      language: "",
      duration: "",
      imdb: "",
      genres: [],
      directors: [],
      stars: [],
      thumbnail: ""
    };
  }
}

// ---------- Pixeldrain Links ----------
async function getPixeldrainLinks(movieUrl) {
  console.log(`\x1b[34m🔗 Fetching download links...\x1b[0m`);
  try {
    const { data } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    const rows = [];
    
    $(".link-pixeldrain tbody tr").each((i, tr) => {
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
    
    for (const l of rows.slice(0, 3)) {
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
          const directUrl = getDirectPixeldrainUrl(finalUrl);
          
          if (directUrl) {
            let sizeMB = 0;
            const sizeText = l.size.toUpperCase();
            if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
            else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
            
            if (sizeMB <= 2048) {
              links.push({ 
                link: directUrl,
                quality: normalizeQuality(l.quality), 
                size: l.size
              });
            }
          }
        }
      } catch (error) {
        console.error(`\x1b[31m❌ Link processing error: ${error.message}\x1b[0m`);
      }
    }
    
    console.log(`\x1b[32m✅ Found ${links.length} streaming links\x1b[0m`);
    return links;
  } catch (error) {
    console.error(`\x1b[31m❌ Pixeldrain links error: ${error.message}\x1b[0m`);
    return [];
  }
}

/* ================= COMMAND: MOVIE SEARCH ================= */
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema","film"],
  react: "🎬",
  desc: "Search SinhalaSub movies (Cloudflare Streaming)",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  memoryMonitor.start();
  
  if (!q) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply(`*🎬 CLOUDFLARE STREAMING MOVIES*\n\nUsage: .movie name\nExample: .movie avengers\n\n*🚀 Features:*\n• Cloudflare Global CDN\n• Zero bot memory usage\n• Fast edge streaming`);
  }

  const searchResults = await searchMovies(q);
  if (!searchResults.length) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply("*❌ No movies found!*");
  }

  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

  if (config.BUTTON) {
    const rows = searchResults.map((movie, i) => ({
      id: `${i+1}`,
      title: movie.title,
      description: `Language: ${movie.language} | Quality: ${movie.quality}`
    }));

    const interactiveButtons = [{
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Movie Search Results",
        sections: [{ title: "Select a movie (Cloudflare Streaming)", rows }]
      })
    }];

    const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗖𝗟𝗢𝗨𝗗𝗙𝗟𝗔𝗥𝗘 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
┃ 🚀 *Streaming via Cloudflare CDN*  
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃━━━━━━━━━━━━━━━━━━━━━━✦
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯

─────────────────────────`;
    
    await danuwa.sendMessage(from, { image: { url: imageUrl } }, { quoted: mek });
    await sendInteractiveMessage(danuwa, from, { text: caption, interactiveButtons, quoted: mek });

  } else {
    const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    let filmListMessage = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗖𝗟𝗢𝗨𝗗𝗙𝗟𝗔𝗥𝗘 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕    
┃ 🚀 *Streaming via Cloudflare CDN*  
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃━━━━━━━━━━━━━━━━━━━━━━✦
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯

─────────────────────────`;

    searchResults.forEach((movie, index) => {
      let adjustedIndex = index + 1;
      let emojiIndex = adjustedIndex
        .toString()
        .split("")
        .map(num => numberEmojis[num])
        .join("");

      filmListMessage += `${emojiIndex} *${movie.title}*\n`;
      filmListMessage += `   📁 ${movie.quality} | 🎭 ${movie.language}\n\n`;
    });

    filmListMessage += `*📝 Reply with movie number (1-${searchResults.length})*\n`;
    filmListMessage += `*🚀 Cloudflare Streaming: Zero bot memory usage*`;

    await danuwa.sendMessage(from, {
      image: { url: imageUrl },
      caption: filmListMessage,
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
  }
  
  console.log('\x1b[33m⏳ Waiting for user selection...\x1b[0m');
});

/* ================= COMMAND: MOVIE SELECTION ================= */
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];

  console.log(`\x1b[34m🎬 Selected: ${selected.title}\x1b[0m`);
  
  reply("*🔍 Fetching movie details...*");
  const metadata = await getMovieMetadata(selected.movieUrl);

  let msg = `───────────────────────── 
*🎬 ${metadata.title}*
───────────────────────── 
*📝 Language:* ${metadata.language}
*⏱️ Duration:* ${metadata.duration}
*⭐ IMDb:* ${metadata.imdb}
*🎭 Genres:* ${metadata.genres.join(", ")}
*🎥 Directors:* ${metadata.directors.join(", ")}
───────────────────────── 
*🔄 Getting Cloudflare streaming links...*`;

  if (metadata.thumbnail) {
    await danuwa.sendMessage(from, { 
      image: { url: metadata.thumbnail }, 
      caption: msg,
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
  } else {
    await danuwa.sendMessage(from, { text: msg }, { quoted: mek });
  }

  const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
  if (!downloadLinks.length) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply("*❌ No streaming links found!*");
  }

  pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

  if (config.BUTTON) {
    const buttons = downloadLinks.map((d, i) => ({ 
      id: `${i+1}`, 
      text: `🎬 ${d.quality} (${d.size})` 
    }));
    
    await sendButtons(danuwa, from, { 
      text: "─────────────────────────\n*📝 CHOOSE STREAMING QUALITY 🚀*\n*🌍 Streaming via Cloudflare Global CDN*\n─────────────────────────", 
      buttons 
    }, { quoted: mek });
  } else {
    let text = `─────────────────────────
*📝 CHOOSE STREAMING QUALITY 🚀*
─────────────────────────
*🌍 Cloudflare Streaming Features:*
• Zero bot memory usage
• Global 300+ edge locations
• No buffering on your VPS
• Supports up to 2GB files
─────────────────────────
`;
    
    downloadLinks.forEach((d, i) => {
      text += `${i+1}. 🎬 *${d.quality}* (${d.size})\n`;
    });
    
    text += `\n─────────────────────────\n`;
    text += `*📝 Reply with number (1-${downloadLinks.length})*\n`;
    text += `*🚀 Files will stream via Cloudflare CDN*`;
    
    reply(text);
  }
  
  console.log('\x1b[33m⏳ Waiting for quality selection...\x1b[0m');
});

/* ================= COMMAND: QUALITY SELECTION ================= */
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  console.log(`\x1b[34m🚀 Streaming: ${selectedLink.quality} - ${selectedLink.size}\x1b[0m`);
  
  reply(`*🚀 Starting Cloudflare streaming of ${selectedLink.quality}...*\n\n*📦 Size: ${selectedLink.size}*\n*🌍 Method: Cloudflare Global CDN*`);

  try {
    const safeFileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`
      .replace(/[^\w\s.-]/gi,'')
      .replace(/\s+/g, ' ')
      .trim();
    
    const caption = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
*🚀 Method:* Cloudflare Streaming
*🌍 Network:* 300+ Global Edge Locations
*💡 Memory:* Zero bot usage
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
    
    await streamViaCloudflare(
      danuwa, 
      from, 
      selectedLink.link,
      safeFileName,
      caption,
      mek
    );
    
    console.log(`\x1b[32m✅ Cloudflare streaming completed!\x1b[0m`);
    
  } catch (error) {
    console.error(`\x1b[31m❌ Streaming error:\x1b[0m`, error);
    
    reply(`*⚠️ All streaming methods failed!*\n\n*Error:* ${error.message}`);
    
  } finally {
    setTimeout(() => {
      memoryMonitor.stop();
      console.log(`\x1b[32m✨ Movie operation completed!\x1b[0m`);
    }, 3000);
  }
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
}, 2 * 60 * 1000);

module.exports = { 
  pendingSearch, 
  pendingQuality,
  memoryMonitor
};
