const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== REALTIME MEMORY MONITOR ==========
class MemoryMonitor {
    constructor(updateInterval = 100) {
        this.interval = null;
        this.isMonitoring = false;
        this.startTime = null;
        this.lineCount = 8;
        this.displayLines = [];
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
        return [
            `╔══════════════════════════════════════════════════╗`,
            `║      🎬 MOVIE PLUGIN - REALTIME MEMORY MONITOR   ║`,
            `╠══════════════════════════════════════════════════╣`,
            `║  ⏱️  Uptime: ${stats.elapsed.padEnd(12)}                ║`,
            `║  📊 RSS: ${stats.rss.padEnd(8)} MB                      ║`,
            `║  💾 Heap Used: ${stats.heapUsed.padEnd(8)} MB              ║`,
            `║  🔥 Heap Total: ${stats.heapTotal.padEnd(8)} MB             ║`,
            `║  🌐 External: ${stats.external.padEnd(8)} MB               ║`,
            `╚══════════════════════════════════════════════════╝`
        ];
    }

    updateDisplay() {
        const stats = this.getMemoryStats();
        const newLines = this.createDisplay(stats);
        
        if (!this.displayLines.length) {
            this.displayLines = newLines;
            newLines.forEach(line => console.log(`\x1b[36m${line}\x1b[0m`));
            return;
        }
        
        process.stdout.write('\x1B[' + this.lineCount + 'A');
        
        newLines.forEach((line, i) => {
            process.stdout.write('\x1B[2K');
            console.log(`\x1b[36m${line}\x1b[0m`);
        });
        
        this.displayLines = newLines;
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        this.displayLines = [];
        
        console.log('\n');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log('\x1b[42m\x1b[30m             🎬 DANUWA MOVIE DOWNLOADER ACTIVATED             \x1b[0m');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log('\x1b[33m📊 Memory monitoring started (Updates every 100ms)\x1b[0m\n');
        
        this.updateDisplay();
        
        this.interval = setInterval(() => {
            this.updateDisplay();
        }, updateInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        if (this.isMonitoring) {
            process.stdout.write('\x1B[' + (this.lineCount + 1) + 'A');
            for (let i = 0; i < this.lineCount + 2; i++) {
                process.stdout.write('\x1B[2K\x1B[1B');
            }
            
            console.log('\x1b[32m════════════════════════════════════════════════════\x1b[0m');
            console.log('\x1b[32m✅ Memory monitoring stopped                       \x1b[0m');
            console.log('\x1b[32m════════════════════════════════════════════════════\x1b[0m\n');
        }
        
        this.isMonitoring = false;
    }
}

const memoryMonitor = new MemoryMonitor();
// ========== END MEMORY MONITOR ==========

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

async function getFileSizeFromUrl(url) {
  try {
    const response = await axios.head(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      const bytes = parseInt(contentLength);
      if (bytes > 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    }
  } catch (error) {
    // If HEAD fails, we'll use the original size
  }
  return null;
}

// ---------- Stream Large File to WhatsApp ----------
async function streamLargeFileToWhatsApp(danuwa, from, fileUrl, fileName, caption, quoted) {
  return new Promise((resolve, reject) => {
    console.log(`\x1b[36m📡 Streaming large file: ${fileName}\x1b[0m`);
    
    danuwa.sendMessage(from, {
      document: { 
        url: fileUrl  // Direct URL - WhatsApp downloads it directly
      },
      mimetype: "video/mp4",
      fileName: fileName,
      caption: caption,
      contextInfo: {       
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1
        }
      }
    }, { quoted: quoted })
    .then(messageInfo => {
      console.log(`\x1b[32m✅ File sent via direct streaming!\x1b[0m`);
      console.log(`\x1b[32m🔗 Source URL: ${fileUrl}\x1b[0m`);
      resolve(messageInfo);
    })
    .catch(error => {
      console.error(`\x1b[31m❌ Streaming error: ${error.message}\x1b[0m`);
      reject(error);
    });
  });
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

// ---------- Pixeldrain Links with Streaming Support ----------
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
    
    // Process up to 5 links
    for (const l of rows.slice(0, 5)) {
      try {
        console.log(`\x1b[33m🔗 Processing: ${l.quality} - ${l.size}\x1b[0m`);
        
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
          
          // Increase limit to 2GB (2048MB)
          if (sizeMB <= 2048) {
            const directUrl = getDirectPixeldrainUrl(finalUrl);
            
            if (!directUrl) continue;
            
            // Try to get accurate file size
            let accurateSize = l.size;
            try {
              const actualSize = await getFileSizeFromUrl(directUrl);
              if (actualSize) {
                accurateSize = actualSize;
              }
            } catch (sizeError) {
              console.log(`\x1b[33m⚠️ Using estimated size: ${l.size}\x1b[0m`);
            }
            
            links.push({ 
              link: directUrl,
              quality: normalizeQuality(l.quality), 
              size: accurateSize,
              originalLink: finalUrl
            });
            
            console.log(`\x1b[32m✅ Link ready: ${normalizeQuality(l.quality)} - ${accurateSize}\x1b[0m`);
          } else {
            console.log(`\x1b[33m⚠️ Skipped: ${l.size} exceeds 2GB limit\x1b[0m`);
          }
        }
      } catch (error) {
        console.error(`\x1b[31m❌ Link processing error: ${error.message}\x1b[0m`);
      }
    }
    
    console.log(`\x1b[32m✅ Total links found: ${links.length}\x1b[0m`);
    return links;
  } catch (error) {
    console.error(`\x1b[31m❌ Pixeldrain links error: ${error.message}\x1b[0m`);
    return [];
  }
}

/* ================= COMMAND: MOVIE SEARCH ================= */
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema","cinema"],
  react: "🎬",
  desc: "Search SinhalaSub movies (Supports up to 2GB files)",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  // Start memory monitoring
  memoryMonitor.start();
  
  if (!q) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply(`*🎬 Movie Search Plugin*\n\nUsage: .movie movie_name\nExample: .movie avengers\n\n*💡 Supports files up to 2GB*`);
  }

  const searchResults = await searchMovies(q);
  if (!searchResults.length) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply("*❌ No movies found!*\n\nTry another search term.");
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
┃ 💡 *Supports up to 2GB files*  
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
┃ 💡 *Supports up to 2GB files*  
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
    filmListMessage += `*💡 Supports files up to 2GB via direct streaming*`;

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

  console.log(`\x1b[34m🎬 User selected: ${selected.title}\x1b[0m`);
  
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
*✨ Stars:* ${metadata.stars.slice(0, 3).join(", ")}
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
    return reply("*❌ No download links found (under 2GB)!*\n\nTry another movie or quality.");
  }

  pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

  if (config.BUTTON) {
    const buttons = downloadLinks.map((d, i) => ({ 
      id: `${i+1}`, 
      text: `🎬 ${d.quality} (${d.size})` 
    }));
    
    await sendButtons(danuwa, from, { 
      text: "─────────────────────────\n*📝 CHOOSE MOVIE QUALITY 🎯*\n*💡 Files stream directly (No bot memory used)*\n─────────────────────────", 
      buttons 
    }, { quoted: mek });
  } else {
    let text = `─────────────────────────
*📝 CHOOSE MOVIE QUALITY 🎯*
─────────────────────────
*💡 Files stream directly (No bot memory used)*
*📦 Supports up to 2GB files*
─────────────────────────
`;
    
    downloadLinks.forEach((d, i) => {
      text += `${i+1}. 🎬 *${d.quality}* (${d.size})\n`;
    });
    
    text += `\n─────────────────────────\n`;
    text += `*📝 Reply with the number (1-${downloadLinks.length})*\n`;
    text += `*⚡ Files will stream directly from source*`;
    
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
  console.log(`\x1b[34m⬇️ Streaming: ${selectedLink.quality} - ${selectedLink.size}\x1b[0m`);
  
  reply(`*ඔයාගෙ ${selectedLink.quality} movie එක Document එකක් විදියට එවන්නම් ඉන්න 🙌*\n\n*📦 Size: ${selectedLink.size}*\n*⚡ Method: Direct Streaming (No bot memory)*`);

  try {
    // Create safe filename
    const safeFileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`
      .replace(/[^\w\s.-]/gi,'')
      .replace(/\s+/g, ' ')
      .trim();
    
    const caption = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
*🚀 Method:* Direct Streaming
*💡 No bot memory used*
─────────────────────────        
🎥 Power. By *DANUKA DISANAYAKA* 🔥`;
    
    // Use streaming method (NO MEMORY USAGE!)
    await streamLargeFileToWhatsApp(
      danuwa, 
      from, 
      selectedLink.link, // Direct URL from Pixeldrain
      safeFileName,
      caption,
      mek
    );
    
    console.log('\x1b[32m✅ Movie streaming completed successfully!\x1b[0m');
    console.log('\x1b[32m📊 Memory stayed low during streaming\x1b[0m');
    
  } catch (error) {
    console.error("\x1b[31m❌ Streaming error:\x1b[0m", error);
    
    // Fallback method: Send direct link
    reply(`*⚠️ Streaming failed, sending direct download link...*`);
    
    const downloadMessage = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
───────────────────────── 
*🔗 Direct Download Link:*
\`\`\`
${selectedLink.link}
\`\`\`
*📝 Instructions:*
1. Copy the link above
2. Use any download manager
3. Or open in browser to download
4. Support files up to 2GB
─────────────────────────        
🎥 Power. By *DANUKA DISANAYAKA* 🔥`;
    
    await danuwa.sendMessage(from, { 
      text: downloadMessage,
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
    
  } finally {
    // Stop monitoring after 3 seconds
    setTimeout(() => {
      memoryMonitor.stop();
      console.log('\x1b[32m✨ Movie plugin operation completed!\x1b[0m');
      console.log('\x1b[32m💾 All files streamed without using bot memory\x1b[0m');
    }, 3000);
  }
});

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10 minutes
  
  // Cleanup pending searches
  for (const s in pendingSearch) {
    if (now - pendingSearch[s].timestamp > timeout) {
      console.log(`\x1b[33m🧹 Cleaning up expired search for user: ${s}\x1b[0m`);
      delete pendingSearch[s];
    }
  }
  
  // Cleanup pending quality selections
  for (const s in pendingQuality) {
    if (now - pendingQuality[s].timestamp > timeout) {
      console.log(`\x1b[33m🧹 Cleaning up expired quality selection for user: ${s}\x1b[0m`);
      delete pendingQuality[s];
    }
  }
  
  // Auto-stop monitoring if no active operations for 2 minutes
  if (memoryMonitor.isMonitoring && Object.keys(pendingSearch).length === 0 && Object.keys(pendingQuality).length === 0) {
    const lastActivity = Math.min(
      ...Object.values(pendingSearch).map(s => s.timestamp),
      ...Object.values(pendingQuality).map(q => q.timestamp),
      Date.now()
    );
    
    if (now - lastActivity > 120000) { // 2 minutes
      console.log('\x1b[33m⏰ No active operations for 2 minutes, stopping monitor...\x1b[0m');
      memoryMonitor.stop();
    }
  }
}, 2 * 60 * 1000); // Check every 2 minutes

// Export for other plugins if needed
module.exports = { 
  pendingSearch, 
  pendingQuality,
  searchMovies,
  getMovieMetadata,
  getPixeldrainLinks,
  streamLargeFileToWhatsApp,
  memoryMonitor
};
