// movie.js - Vercel Streaming Plugin with Fixed Handlers
const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== VERCEL CONFIG ==========
// ⚠️ REPLACE WITH YOUR VERCEL URL ⚠️
const VERCEL_URL = 'https://test5689.vercel.app';

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

// ========== HELPER FUNCTIONS ==========
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

// ========== VERCEL STREAMING FUNCTION ==========
async function streamViaVercel(danuwa, from, pixeldrainUrl, fileName, caption, quoted) {
  try {
    // Encode parameters for Vercel
    const encodedUrl = encodeURIComponent(pixeldrainUrl);
    const encodedName = encodeURIComponent(fileName);
    
    // Build Vercel streaming URL
    const vercelStreamUrl = `${VERCEL_URL}/api/stream?url=${encodedUrl}&filename=${encodedName}`;
    
    console.log(`🚀 Vercel Streaming: ${fileName}`);
    console.log(`🔗 Vercel URL: ${vercelStreamUrl}`);
    
    // Send to WhatsApp via Vercel
    const result = await danuwa.sendMessage(from, {
      document: { 
        url: vercelStreamUrl
      },
      mimetype: "video/mp4",
      fileName: fileName,
      caption: caption + `\n\n⚡ Streamed via Vercel Serverless\n🔒 Zero Bot Memory Usage`,
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
    
    console.log(`✅ Vercel streaming successful!`);
    return result;
    
  } catch (error) {
    console.error(`❌ Vercel streaming failed: ${error.message}`);
    
    // Fallback to direct URL
    console.log(`🔄 Falling back to direct URL...`);
    
    try {
      const fallbackResult = await danuwa.sendMessage(from, {
        document: { 
          url: pixeldrainUrl
        },
        mimetype: "video/mp4",
        fileName: fileName,
        caption: caption + `\n\n⚠️ Direct Download (Fallback)`,
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
      
      console.log(`✅ Direct fallback successful`);
      return fallbackResult;
      
    } catch (fallbackError) {
      console.error(`❌ All methods failed`);
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }
}

// ========== MOVIE SEARCH ==========
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
    
    console.log(`✅ Found ${results.length} movies`);
    return results;
  } catch (error) {
    console.error("❌ Search error:", error.message);
    return [];
  }
}

// ========== MOVIE METADATA ==========
async function getMovieMetadata(url) {
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
    console.error("❌ Metadata error:", error.message);
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

// ========== PIXELDRAIN LINKS ==========
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
          // Get direct download URL
          const directUrl = getDirectPixeldrainUrl(finalUrl);
          
          if (directUrl) {
            // Check file size (limit to 500MB for Vercel)
            let sizeMB = 0;
            const sizeText = l.size.toUpperCase();
            if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
            else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
            
            if (sizeMB <= 500) { // 500MB limit for Vercel
              links.push({ 
                link: directUrl,
                quality: normalizeQuality(l.quality), 
                size: l.size
              });
            }
          }
        }
      } catch (error) {
        console.error("❌ Link processing error:", error.message);
      }
    }
    
    console.log(`✅ Found ${links.length} streaming links`);
    return links;
  } catch (error) {
    console.error("❌ Pixeldrain links error:", error.message);
    return [];
  }
}

// ========== VERCEL STATUS CHECK ==========
async function checkVercelStatus() {
  try {
    await axios.get(`${VERCEL_URL}/api/ping`, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

// ========== MAIN COMMAND: MOVIE SEARCH ==========
cmd({
  pattern: "movie",
  alias: ["sinhalasub", "films", "cinema", "film"],
  react: "🎬",
  desc: "Search and stream movies via Vercel",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  if (!q) {
    return reply(`*🎬 VERCEL MOVIE STREAMING*\n\nUsage: .movie movie_name\nExample: .movie avatar\n\n*Powered by Vercel Serverless*`);
  }

  // Check Vercel status
  const vercelOnline = await checkVercelStatus();
  if (!vercelOnline) {
    await reply(`*⚠️ Vercel Status: OFFLINE*\nUsing direct download as fallback...`);
  }

  const searchResults = await searchMovies(q);
  if (!searchResults.length) {
    return reply("*❌ No movies found!*");
  }

  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

  if (config.BUTTON) {
    // -------- BUTTON MODE --------
    const rows = searchResults.map((movie, i) => ({
      id: `${i+1}`,
      title: movie.title,
      description: `Language: ${movie.language} | Quality: ${movie.quality}`
    }));

    const interactiveButtons = [{
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Movie Search Results",
        sections: [{ title: `Found ${searchResults.length} movies for "${q}"`, rows }]
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
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃━━━━━━━━━━━━━━━━━━━━━━✦
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯

─────────────────────────`;
    
    await danuwa.sendMessage(from, {
      image: { url: imageUrl }
    }, { quoted: mek });
    
    await sendInteractiveMessage(danuwa, from, {
      text: caption,
      interactiveButtons,
      quoted: mek
    });

  } else {
    // -------- PLAIN TEXT MODE --------
    const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    let filmListMessage = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗩𝗘𝗥𝗖𝗘𝗟 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕    
┃ 🚀 *Streaming via Vercel Serverless*  
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
    filmListMessage += `*🚀 Vercel Streaming: Zero bot memory usage*`;

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
});

// ========== MOVIE SELECTION HANDLER ==========
// This handler works for both button responses and text replies
cmd({
  on: ["message"],
  fromMe: false,
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  try {
    // Check if it's a movie selection (text reply)
    if (pendingSearch[sender] && body && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= pendingSearch[sender].results.length) {
      
      await danuwa.sendMessage(from, {
        react: { text: "✅", key: mek.key }
      });
      
      const index = parseInt(body) - 1;
      const selected = pendingSearch[sender].results[index];
      delete pendingSearch[sender];

      console.log(`🎬 Selected: ${selected.title}`);
      
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
        return reply("*❌ No streaming links found (<500MB)!*");
      }

      pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

      if (config.BUTTON) {
        // Buttons for quality selection
        const buttons = downloadLinks.map((d, i) => ({ 
          id: `${i+1}`, 
          text: `🎬 ${d.quality} (${d.size})` 
        }));
        
        await sendButtons(danuwa, from, { 
          text: "─────────────────────────\n*📝 CHOOSE STREAMING QUALITY 🚀*\n*🌍 Streaming via Vercel Serverless*\n─────────────────────────", 
          buttons 
        }, { quoted: mek });
      } else {
        // Plain text for quality selection
        let text = `─────────────────────────
*📝 CHOOSE STREAMING QUALITY 🚀*
─────────────────────────
*🌍 Vercel Serverless Streaming:*
• Zero bot memory usage
• Max file size: 500MB
• WhatsApp optimized
─────────────────────────
`;
        
        downloadLinks.forEach((d, i) => {
          text += `${i+1}. 🎬 *${d.quality}* (${d.size})\n`;
        });
        
        text += `\n─────────────────────────\n`;
        text += `*📝 Reply with number (1-${downloadLinks.length})*`;
        
        await reply(text);
      }
    }
    
    // Check if it's a quality selection (text reply)
    else if (pendingQuality[sender] && body && !isNaN(body) && parseInt(body) > 0 && parseInt(body) <= pendingQuality[sender].movie.downloadLinks.length) {
      
      await danuwa.sendMessage(from, {
        react: { text: "✅", key: mek.key }
      });
      
      const index = parseInt(body) - 1;
      const { movie } = pendingQuality[sender];
      delete pendingQuality[sender];

      const selectedLink = movie.downloadLinks[index];
      console.log(`🚀 Streaming: ${selectedLink.quality} - ${selectedLink.size}`);
      
      await reply(`*🚀 Starting Vercel streaming of ${selectedLink.quality}...*\n\n*📦 Size: ${selectedLink.size}*\n*🌍 Method: Vercel Serverless*`);

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
*🔒 Memory:* Zero bot usage
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
        
        console.log(`✅ Vercel streaming completed!`);
        
      } catch (error) {
        console.error(`❌ Streaming error:`, error);
        await reply(`*⚠️ Streaming failed!*\n\n*Error:* ${error.message}\n\n*Direct link:* ${selectedLink.link}`);
      }
    }
  } catch (error) {
    console.error(`❌ Handler error:`, error);
  }
});

// ========== BUTTON RESPONSE HANDLER ==========
// This handler specifically handles interactive button responses
cmd({
  on: ["interactive_message"],
  fromMe: false,
}, async (danuwa, mek, m, { sender, reply, from }) => {
  try {
    const interactiveData = JSON.parse(mek.message.interactiveMessage.nativeFlowMessage.paramsJson || '{}');
    
    // Handle movie selection from button
    if (interactiveData.single_select_reply && pendingSearch[sender]) {
      const selectedId = interactiveData.single_select_reply.selected_row_id;
      const index = parseInt(selectedId) - 1;
      
      if (index >= 0 && index < pendingSearch[sender].results.length) {
        const selected = pendingSearch[sender].results[index];
        delete pendingSearch[sender];

        console.log(`🎬 Button Selected: ${selected.title}`);
        
        await reply("*🔍 Fetching movie details...*");
        const metadata = await getMovieMetadata(selected.movieUrl);

        const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
        if (!downloadLinks.length) {
          return reply("*❌ No streaming links found (<500MB)!*");
        }

        pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

        // Send quality selection as buttons
        const buttons = downloadLinks.map((d, i) => ({ 
          id: `${i+1}`, 
          text: `🎬 ${d.quality} (${d.size})` 
        }));
        
        await sendButtons(danuwa, from, { 
          text: `*🎬 ${metadata.title}*\n\n*Choose streaming quality:*`, 
          buttons 
        }, { quoted: mek });
      }
    }
    
    // Handle quality selection from button
    else if (mek.message.buttonsMessage && pendingQuality[sender]) {
      const buttonId = mek.message.buttonsMessage.selectedId;
      const index = parseInt(buttonId) - 1;
      
      if (index >= 0 && index < pendingQuality[sender].movie.downloadLinks.length) {
        const { movie } = pendingQuality[sender];
        delete pendingQuality[sender];

        const selectedLink = movie.downloadLinks[index];
        console.log(`🚀 Button Quality Selected: ${selectedLink.quality}`);
        
        await reply(`*🚀 Starting Vercel streaming...*`);

        const safeFileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`
          .replace(/[^\w\s.-]/gi,'')
          .trim();
        
        const caption = `*🎬 ${movie.metadata.title}*\n*📊 ${selectedLink.quality} | ${selectedLink.size}*\n*🚀 Vercel Serverless Streaming*`;
        
        await streamViaVercel(
          danuwa, 
          from, 
          selectedLink.link,
          safeFileName,
          caption,
          mek
        );
      }
    }
  } catch (error) {
    console.error(`❌ Button handler error:`, error);
  }
});

// ========== CLEANUP ==========
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

// ========== MODULE EXPORTS ==========
module.exports = { 
  pendingSearch, 
  pendingQuality,
  VERCEL_URL
};
