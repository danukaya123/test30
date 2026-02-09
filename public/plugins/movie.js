// movie.js - Vercel Streaming Plugin
const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== VERCEL CONFIG ==========
// ⚠️ REPLACE WITH YOUR VERCEL URL ⚠️
const VERCEL_URL = 'https://test5689.vercel.app'; // Change this!

// ========== MEMORY MONITOR ==========
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
        console.log('\x1b[42m\x1b[30m          🎬 DANUWA MOVIE + VERCEL STREAMING              \x1b[0m');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log(`\x1b[36m🌍 Vercel URL: ${VERCEL_URL}\x1b[0m`);
        console.log(`\x1b[36m💡 Streaming via Vercel Serverless (Zero bot memory)\x1b[0m\n`);
        
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
            console.log(`\x1b[32m🌍 Vercel handled all heavy lifting\x1b[0m`);
            console.log('\x1b[32m════════════════════════════════════════════════════\x1b[0m\n');
        }
        
        this.isMonitoring = false;
    }
}

const memoryMonitor = new MemoryMonitor();

// ========== VERCEL STREAMING FUNCTION ==========
async function streamViaVercel(danuwa, from, pixeldrainUrl, fileName, caption, quoted) {
  console.log(`\x1b[36m🚀 Vercel Streaming Activated\x1b[0m`);
  console.log(`\x1b[36m📦 File: ${fileName}\x1b[0m`);
  
  try {
    // Encode parameters for Vercel API
    const encodedUrl = encodeURIComponent(pixeldrainUrl);
    const encodedName = encodeURIComponent(fileName);
    
    // Build Vercel streaming URL
    const vercelStreamUrl = `${VERCEL_URL}/api/stream?url=${encodedUrl}&filename=${encodedName}`;
    
    console.log(`\x1b[36m🌐 Vercel URL: ${vercelStreamUrl}\x1b[0m`);
    console.log(`\x1b[33m⚡ Streaming via Vercel Serverless...\x1b[0m`);
    
    // Send to WhatsApp via Vercel
    const result = await danuwa.sendMessage(from, {
      document: { 
        url: vercelStreamUrl  // WhatsApp downloads from Vercel
      },
      mimetype: "video/mp4",
      fileName: fileName,
      caption: caption + `\n\n⚡ Streamed via Vercel Serverless\n🌍 Global CDN Network\n🔒 Zero Bot Memory Usage\n📊 Vercel Hobby Plan (2GB RAM)`,
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
    
    console.log(`\x1b[32m✅ Vercel streaming successful!\x1b[0m`);
    console.log(`\x1b[32m📊 WhatsApp is downloading from Vercel edge server\x1b[0m`);
    
    return result;
    
  } catch (error) {
    console.error(`\x1b[31m❌ Vercel streaming failed: ${error.message}\x1b[0m`);
    
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
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }
}

// ========== HELPER FUNCTIONS ==========
const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

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

// ========== SEARCH FUNCTIONS ==========
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
            
            if (sizeMB <= 500) { // Limit to 500MB for Vercel
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

// ========== VERCEL STATUS CHECK ==========
async function checkVercelStatus() {
  try {
    const response = await axios.get(`${VERCEL_URL}/api/ping`, {
      timeout: 5000
    });
    return response.data.status === 'online';
  } catch (error) {
    console.error(`\x1b[31m❌ Vercel status check failed: ${error.message}\x1b[0m`);
    return false;
  }
}

// ========== COMMANDS ==========

/* ================= COMMAND: MOVIE SEARCH ================= */
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema","film"],
  react: "🎬",
  desc: "Search SinhalaSub movies (Vercel Streaming)",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  memoryMonitor.start();
  
  if (!q) {
    setTimeout(() => memoryMonitor.stop(), 1000);
    return reply(`*🎬 VERCEL MOVIE STREAMING*\n\nUsage: .movie name\nExample: .movie avengers\n\n*🚀 Features:*\n• Vercel Serverless CDN\n• Zero bot memory usage\n• WhatsApp optimized\n• Free Vercel Hobby Plan\n\n*Vercel URL:* ${VERCEL_URL}`);
  }

  // Check Vercel status
  const vercelOnline = await checkVercelStatus();
  if (!vercelOnline) {
    await reply(`*⚠️ Vercel Status: OFFLINE*\n\nPlease check:\n1. Vercel deployment\n2. VERCEL_URL in config\n3. Try direct download for now`);
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
        sections: [{ title: "Select a movie (Vercel Streaming)", rows }]
      })
    }];

    const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗩𝗘𝗥𝗖𝗘𝗟 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
┃ 🚀 *Streaming via Vercel Serverless*  
┃ 💾 *Max: 500MB per file*  
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
    📂 𝗩𝗘𝗥𝗖𝗘𝗟 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕    
┃ 🚀 *Streaming via Vercel Serverless*  
┃ 💾 *Max: 500MB per file*  
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
    filmListMessage += `*🚀 Vercel Streaming: Zero bot memory usage*\n`;
    filmListMessage += `*🌍 Server: ${VERCEL_URL}*`;

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
  on: "text",
  fromMe: false,
  dontAddCommandList: true
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  // Check if this is a movie selection
  if (pendingSearch[sender] && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= pendingSearch[sender].results.length) {
    
    await danuwa.sendMessage(from, { react: { text: "✅", key: mek.key } });
    
    const index = parseInt(body) - 1;
    const selected = pendingSearch[sender].results[index];
    delete pendingSearch[sender];

    console.log(`\x1b[34m🎬 Selected: ${selected.title}\x1b[0m`);
    
    await reply("*🔍 Fetching movie details...*");
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
*🔄 Getting Vercel streaming links...*`;

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
        text: "─────────────────────────\n*📝 CHOOSE STREAMING QUALITY 🚀*\n*🌍 Streaming via Vercel Serverless*\n*💾 Max 500MB per file*\n─────────────────────────", 
        buttons 
      }, { quoted: mek });
    } else {
      let text = `─────────────────────────
*📝 CHOOSE STREAMING QUALITY 🚀*
─────────────────────────
*🌍 Vercel Serverless Features:*
• Zero bot memory usage (2GB RAM limit)
• Global CDN network
• WhatsApp optimized
• Max file size: 500MB
─────────────────────────
`;
      
      downloadLinks.forEach((d, i) => {
        text += `${i+1}. 🎬 *${d.quality}* (${d.size})\n`;
      });
      
      text += `\n─────────────────────────\n`;
      text += `*📝 Reply with number (1-${downloadLinks.length})*\n`;
      text += `*🚀 Files will stream via Vercel Serverless*`;
      
      await reply(text);
    }
    
    console.log('\x1b[33m⏳ Waiting for quality selection...\x1b[0m');
  }
});

/* ================= COMMAND: QUALITY SELECTION ================= */
cmd({
  on: "text",
  fromMe: false,
  dontAddCommandList: true
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  // Check if this is a quality selection
  if (pendingQuality[sender] && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= pendingQuality[sender].movie.downloadLinks.length) {

    await danuwa.sendMessage(from, { react: { text: "✅", key: mek.key } });
    
    const index = parseInt(body) - 1;
    const { movie } = pendingQuality[sender];
    delete pendingQuality[sender];

    const selectedLink = movie.downloadLinks[index];
    console.log(`\x1b[34m🚀 Streaming: ${selectedLink.quality} - ${selectedLink.size}\x1b[0m`);
    
    await reply(`*🚀 Starting Vercel streaming of ${selectedLink.quality}...*\n\n*📦 Size: ${selectedLink.size}*\n*🌍 Method: Vercel Serverless*\n*⏱️ Please wait 10-30 seconds...*`);

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
*🚀 Method:* Vercel Serverless
*🌍 Network:* Global CDN
*💡 Memory:* Zero bot usage
*📊 Vercel:* 2GB RAM Hobby Plan
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
      
      await streamViaVercel(
        danuwa, 
        from, 
        selectedLink.link,
        safeFileName,
        caption,
        mek
      );
      
      console.log(`\x1b[32m✅ Vercel streaming completed!\x1b[0m`);
      
    } catch (error) {
      console.error(`\x1b[31m❌ Streaming error:\x1b[0m`, error);
      
      await reply(`*⚠️ Vercel streaming failed!*\n\n*Error:* ${error.message}\n\n*Try direct download:*\n${selectedLink.link}`);
      
    } finally {
      setTimeout(() => {
        memoryMonitor.stop();
        console.log(`\x1b[32m✨ Movie operation completed!\x1b[0m`);
      }, 3000);
    }
  }
});

/* ================= VERCEL STATUS COMMAND ================= */
cmd({
  pattern: "vstatus",
  alias: ["vercel","vercelstatus"],
  react: "🌍",
  desc: "Check Vercel streaming status",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, reply }) => {
  
  const isOnline = await checkVercelStatus();
  
  if (isOnline) {
    await reply(`*🌍 VERCEL STATUS*\n\n` +
                `✅ Status: ONLINE\n` +
                `🔗 URL: ${VERCEL_URL}\n` +
                `💾 Plan: Hobby (2GB RAM)\n` +
                `🚀 Streaming: Ready\n` +
                `🌍 CDN: Global\n\n` +
                `*Endpoints:*\n` +
                `• ${VERCEL_URL}/api/stream\n` +
                `• ${VERCEL_URL}/api/ping\n\n` +
                `*Ready for movie streaming!* 🎬`);
  } else {
    await reply(`*🌍 VERCEL STATUS*\n\n` +
                `❌ Status: OFFLINE\n` +
                `🔗 URL: ${VERCEL_URL}\n` +
                `⚠️ Error: Cannot connect\n\n` +
                `*Please check:*\n` +
                `1. Vercel deployment status\n` +
                `2. VERCEL_URL in plugin config\n` +
                `3. Internet connection\n\n` +
                `*Current config:*\n\`${VERCEL_URL}\``);
  }
});

/* ================= DIRECT STREAM COMMAND ================= */
cmd({
  pattern: "vstream",
  alias: ["vs","vercelstream"],
  react: "⚡",
  desc: "Direct stream any file via Vercel",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, reply }) => {
  
  if (!q) {
    return reply(`*⚡ VERCEL DIRECT STREAM*\n\nUsage: .vstream url [filename]\nExample: .vstream https://example.com/file.mp4 movie.mp4\n\n*Max file size:* 500MB\n*Streaming via Vercel Serverless*`);
  }

  const args = q.split(' ');
  let url, filename;
  
  if (args.length >= 2) {
    url = args[0];
    filename = args.slice(1).join(' ');
  } else {
    url = q;
    filename = url.split('/').pop() || 'download.mp4';
  }
  
  // Validate URL
  if (!url.startsWith('http')) {
    return reply(`*❌ Invalid URL*\n\nPlease provide a valid http/https URL.`);
  }
  
  console.log(`⚡ Direct Vercel stream: ${filename}`);
  
  memoryMonitor.start();
  
  try {
    const encodedUrl = encodeURIComponent(url);
    const encodedName = encodeURIComponent(filename);
    const vercelStreamUrl = `${VERCEL_URL}/api/stream?url=${encodedUrl}&filename=${encodedName}`;
    
    await reply(`*⚡ Starting Vercel stream...*\n\n` +
                `*File:* ${filename}\n` +
                `*Vercel URL:* ${vercelStreamUrl.substring(0, 60)}...\n` +
                `*Status:* Initializing...`);
    
    await danuwa.sendMessage(from, {
      document: {
        url: vercelStreamUrl
      },
      mimetype: "application/octet-stream",
      fileName: filename,
      caption: `📥 *${filename}*\n` +
               `⚡ Streamed via Vercel Serverless\n` +
               `🌍 Zero bot memory usage\n` +
               `🚀 Global CDN delivery`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: mek });
    
    console.log(`✅ Direct Vercel stream successful`);
    
  } catch (error) {
    console.error(`❌ Direct stream error:`, error);
    await reply(`*❌ Vercel streaming failed*\n\n*Error:* ${error.message}\n\n*Direct URL:* ${url}`);
  } finally {
    setTimeout(() => {
      memoryMonitor.stop();
    }, 2000);
  }
});

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10 minutes
  
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
}, 2 * 60 * 1000); // Check every 2 minutes

// ========== MODULE EXPORTS ==========
module.exports = { 
  pendingSearch, 
  pendingQuality,
  memoryMonitor,
  streamViaVercel,
  VERCEL_URL,
  checkVercelStatus
};
