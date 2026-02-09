const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== MULTI-LINE UPDATING CONSOLE MONITOR ==========
class MemoryMonitor {
    constructor(updateInterval = 100) {
        this.interval = null;
        this.isMonitoring = false;
        this.startTime = null;
        this.lineCount = 8; // Number of lines in our display
        this.currentLines = [];
    }

    formatMemory(bytes) {
        const mb = bytes / 1024 / 1024;
        return mb.toFixed(2);
    }

    getMemoryStats() {
        const mem = process.memoryUsage();
        const elapsed = Date.now() - this.startTime;
        
        return {
            elapsed: elapsed < 1000 ? `${elapsed} ms` : `${(elapsed/1000).toFixed(1)} s`,
            rss: this.formatMemory(mem.rss),
            heapUsed: this.formatMemory(mem.heapUsed),
            heapTotal: this.formatMemory(mem.heapTotal),
            external: this.formatMemory(mem.external)
        };
    }

    createDisplay(stats) {
        const lines = [];
        lines.push(`╔══════════════════════════════════════════════════╗`);
        lines.push(`║      🎬 MOVIE PLUGIN - REALTIME MEMORY MONITOR   ║`);
        lines.push(`╠══════════════════════════════════════════════════╣`);
        lines.push(`║  ⏱️  Uptime: ${stats.elapsed.padEnd(12)}                ║`);
        lines.push(`║  📊 RSS: ${stats.rss.padEnd(8)} MB                      ║`);
        lines.push(`║  💾 Heap Used: ${stats.heapUsed.padEnd(8)} MB              ║`);
        lines.push(`║  🔥 Heap Total: ${stats.heapTotal.padEnd(8)} MB             ║`);
        lines.push(`║  🌐 External: ${stats.external.padEnd(8)} MB               ║`);
        lines.push(`╚══════════════════════════════════════════════════╝`);
        return lines;
    }

    updateDisplay() {
        const stats = this.getMemoryStats();
        const newLines = this.createDisplay(stats);
        
        // Move cursor up to the start of our display
        process.stdout.write('\x1B[' + this.lineCount + 'A');
        
        // Print all lines
        newLines.forEach(line => {
            process.stdout.write('\x1B[2K'); // Clear line
            console.log(`\x1b[36m${line}\x1b[0m`);
        });
        
        this.currentLines = newLines;
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        
        console.log('\n'); // Add some space
        this.currentLines = this.createDisplay(this.getMemoryStats());
        
        // Print initial display
        this.currentLines.forEach(line => {
            console.log(`\x1b[36m${line}\x1b[0m`);
        });
        
        // Start updating
        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 100); // Update every 100ms
        
        console.log('\x1b[33m📊 Monitoring started - Updating every 100ms\x1b[0m\n');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isMonitoring = false;
        
        // Clear the display area
        process.stdout.write('\x1B[' + (this.lineCount + 1) + 'A');
        for (let i = 0; i < this.lineCount + 2; i++) {
            process.stdout.write('\x1B[2K\n');
        }
        
        console.log('\x1b[32m✅ Memory monitoring stopped\x1b[0m\n');
    }
}

const memoryMonitor = new MemoryMonitor();
// ========== END MEMORY MONITOR ==========

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

// Helper functions remain the same...
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

// Movie search function...
async function searchMovies(query) {
  console.log(`\x1b[34m🔍 Searching movies for: ${query}\x1b[0m`);
  const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
    console.error("Search error:", error.message);
    return [];
  }
}

// Movie metadata function...
async function getMovieMetadata(url) {
  console.log(`\x1b[34m📥 Fetching metadata...\x1b[0m`);
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
    console.error("Metadata error:", error.message);
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

// Pixeldrain links function...
async function getPixeldrainLinks(movieUrl) {
  console.log(`\x1b[34m🔗 Fetching download links...\x1b[0m`);
  try {
    const { data } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
          }
        });
        
        const $$ = cheerio.load(pageData);
        const finalUrl = $$(".wait-done a[href^='https://pixeldrain.com/']").attr("href");
        
        if (finalUrl) {
          let sizeMB = 0;
          const sizeText = l.size.toUpperCase();
          if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
          else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
          
          if (sizeMB <= 1536) {
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
    
    console.log(`\x1b[32m✅ Found ${links.length} download links\x1b[0m`);
    return links;
  } catch (error) {
    console.error("Pixeldrain links error:", error.message);
    return [];
  }
}

// ================= COMMAND: MOVIE SEARCH =================
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema"],
  react: "🎬",
  desc: "Search SinhalaSub movies",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  // Start memory monitoring
  memoryMonitor.start();
  
  if (!q) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply(`*🎬 Movie Search Plugin*\nUsage: movie_name\nExample: movie avengers`);
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
      description: `Language: ${movie.language} | Quality: ${movie.quality} | Format: ${movie.qty}`
    }));

    const interactiveButtons = [{
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Movie Search Results",
        sections: [{ title: "Select a movie", rows }]
      })
    }];

    const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗠𝗢𝗩𝗜𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
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
    📂 𝗠𝗢𝗩𝗜𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕    
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

      filmListMessage += `${emojiIndex} *${movie.title}*\n\n`;
    });

    filmListMessage += `*📝 Reply with movie number (1-${searchResults.length})*`;

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

// ================= COMMAND: MOVIE SELECTION =================
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];

  console.log(`\x1b[34m🎬 Selected: ${selected.title}\x1b[0m`);
  
  reply("*පොඩ්ඩක් ඉදහම් Film එකේ විස්තර ටික එවන්නම්...👀❤️‍🩹*");
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
*විනාඩියක් ඉන්න Quality List එක එවනකම් 😶‍🌫️*`;

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
    return reply("*❌ No download links found (<1.5GB)!*");
  }

  pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

  if (config.BUTTON) {
    const buttons = downloadLinks.map((d, i) => ({ id: `${i+1}`, text: `💡 ${d.quality} (${d.size})` }));
    await sendButtons(danuwa, from, { text: "─────────────────────────\n *📝CHOOSE MOVIE QUALITY❕👀*\n ─────────────────────────", buttons }, { quoted: mek });
  } else {
    let text = `─────────────────────────
📝CHOOSE MOVIE QUALITY❕👀
─────────────────────────
`;
    downloadLinks.forEach((d, i) => {
      text += `${i+1}. ${d.quality} (${d.size})\n`;
    });
    text += `\n*Reply with the number (1-${downloadLinks.length})*`;
    reply(text);
  }
  
  console.log('\x1b[33m⏳ Waiting for quality selection...\x1b[0m');
});

// ================= COMMAND: QUALITY SELECTION =================
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  console.log(`\x1b[34m⬇️ Downloading: ${selectedLink.quality} - ${selectedLink.size}\x1b[0m`);
  
  reply(`*ඔයාගෙ ${selectedLink.quality} movie එක Document එකක් විදියට එවන්නම් ඉන්න 🙌*`);

  try {
    const directUrl = getDirectPixeldrainUrl(selectedLink.link);
    
    console.log('\x1b[36m🚀 Starting movie download...\x1b[0m');
    
    await danuwa.sendMessage(from, {
      document: { url: directUrl },
      mimetype: "video/mp4",
      fileName: `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`.replace(/[^\w\s.-]/gi,''),
      caption: `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
─────────────────────────        
🚀 Pow. By *DANUKA DISANAYAKA* 🔥`,
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
    
    console.log('\x1b[32m✅ Movie download completed!\x1b[0m');
    
  } catch (error) {
    console.error("\x1b[31m❌ Send document error:\x1b[0m", error);
    reply(`*❌ Failed to send movie:* ${error.message || "Unknown error"}`);
  } finally {
    setTimeout(() => {
      memoryMonitor.stop();
      console.log('\x1b[32m✨ Movie plugin operation completed!\x1b[0m');
    }, 2000);
  }
});

// ================= CLEANUP =================
setInterval(() => {
  const now = Date.now();
  const timeout = 10*60*1000;
  for (const s in pendingSearch) if (now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  for (const s in pendingQuality) if (now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
  
  if (memoryMonitor.isMonitoring && Object.keys(pendingSearch).length === 0 && Object.keys(pendingQuality).length === 0) {
    setTimeout(() => {
      if (Object.keys(pendingSearch).length === 0 && Object.keys(pendingQuality).length === 0) {
        memoryMonitor.stop();
      }
    }, 30000);
  }
}, 5*60*1000);

module.exports = { pendingSearch, pendingQuality };
