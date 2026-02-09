const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");

// ========== VERCEL CONFIG ==========
const VERCEL_URL = 'https://your-vercel-app.vercel.app'; // ⚠️ CHANGE THIS

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

// ---------- Helpers ----------
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

// ---------- Vercel Streaming ----------
async function streamViaVercel(danuwa, from, pixeldrainUrl, fileName, caption, quoted) {
  try {
    const encodedUrl = encodeURIComponent(pixeldrainUrl);
    const encodedName = encodeURIComponent(fileName);
    const vercelStreamUrl = `${VERCEL_URL}/api/stream?url=${encodedUrl}&filename=${encodedName}`;
    
    console.log(`🚀 Vercel Streaming: ${fileName}`);
    
    // Send via Vercel
    return await danuwa.sendMessage(from, {
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
    
  } catch (error) {
    console.error(`❌ Vercel streaming failed: ${error.message}`);
    
    // Fallback to direct URL
    try {
      return await danuwa.sendMessage(from, {
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
    } catch (fallbackError) {
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }
}

// ---------- Movie Search ----------
async function searchMovies(query) {
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
    
    return results;
  } catch (error) {
    console.error("Search error:", error.message);
    return [];
  }
}

// ---------- Movie Metadata ----------
async function getMovieMetadata(url) {
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

// ---------- Pixeldrain Links ----------
async function getPixeldrainLinks(movieUrl) {
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
          
          if (sizeMB <= 500) { // 500MB limit for Vercel
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

// ================= COMMAND: MOVIE SEARCH =================
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema"],
  react: "🎬",
  desc: "Search SinhalaSub movies",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  if (!q) return reply(`*🎬 Movie Search Plugin*\nUsage: movie_name\nExample: movie avengers`);

  const searchResults = await searchMovies(q);
  if (!searchResults.length) return reply("*❌ No movies found!*");

  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

  if (config.BUTTON) {
    // -------- Single Select Menu --------
    const rows = searchResults.map((movie, i) => ({
      id: `${i+1}`,
      title: movie.title,
      description: `Language: ${movie.language} | Quality: ${movie.quality} | Format: ${movie.qty}`
    }));

    const interactiveButtons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "Movie Search Results",
          sections: [{ title: "Select a movie", rows }]
        })
      }
    ];

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

─────────────────────────
`;
    
    await danuwa.sendMessage(from, {
      image: { url: imageUrl },
    }, { quoted: mek });
    
    await sendInteractiveMessage(danuwa, from, {
      text: caption,
      interactiveButtons,
      quoted: mek
    });

  } else {
    // -------- Plain Text Reply --------
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
});

// ================= BUTTON INTERACTIVE HANDLER =================
// This handles interactive message responses (single_select menu)
cmd({
  on: ["interactive_message"],
  fromMe: false,
}, async (danuwa, mek, m, { sender, reply, from }) => {
  try {
    // Check if it's an interactive message response
    if (mek.message.interactiveMessage) {
      const interactiveMsg = mek.message.interactiveMessage;
      
      // Handle single_select menu response
      if (interactiveMsg.nativeFlowMessage && interactiveMsg.nativeFlowMessage.paramsJson) {
        const params = JSON.parse(interactiveMsg.nativeFlowMessage.paramsJson);
        
        // Check if this is a movie selection
        if (params.single_select_reply && pendingSearch[sender]) {
          const selectedId = params.single_select_reply.selected_row_id;
          const index = parseInt(selectedId) - 1;
          
          if (index >= 0 && index < pendingSearch[sender].results.length) {
            const selected = pendingSearch[sender].results[index];
            delete pendingSearch[sender];

            console.log(`🎬 Button Selected: ${selected.title}`);
            
            await danuwa.sendMessage(from, {
              react: { text: "✅", key: mek.key }
            });
            
            await reply("*පොඩ්ඩක් ඉදහම් Film එකේ විස්තර ටික එවන්නම්...👀❤️‍🩹*");
            
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
            if (!downloadLinks.length) return reply("*❌ No download links found (<500MB)!*");

            pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

            if (config.BUTTON) {
              // Send quality selection as buttons
              const buttons = downloadLinks.map((d, i) => ({ 
                id: `${i+1}`, 
                text: `💡 ${d.quality} (${d.size})` 
              }));
              
              await sendButtons(danuwa, from, { 
                text: "─────────────────────────\n *📝CHOOSE MOVIE QUALITY❕👀*\n ─────────────────────────", 
                buttons 
              }, { quoted: mek });
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
          }
        }
      }
    }
    
    // Handle regular button message response
    else if (mek.message.buttonsMessage && mek.message.buttonsMessage.selectedButtonId) {
      const buttonId = mek.message.buttonsMessage.selectedButtonId;
      const index = parseInt(buttonId) - 1;
      
      // Check if this is a quality selection
      if (pendingQuality[sender] && index >= 0 && index < pendingQuality[sender].movie.downloadLinks.length) {
        const { movie } = pendingQuality[sender];
        delete pendingQuality[sender];

        const selectedLink = movie.downloadLinks[index];
        
        await danuwa.sendMessage(from, {
          react: { text: "✅", key: mek.key }
        });
        
        await reply(`*ඔයාගෙ ${selectedLink.quality} movie එක Vercel හරහා එවන්නම් ඉන්න 🙌*`);

        try {
          const directUrl = getDirectPixeldrainUrl(selectedLink.link);
          const fileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`.replace(/[^\w\s.-]/gi,'');
          
          const caption = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
*🚀 Method:* Vercel Serverless
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
          
          await streamViaVercel(
            danuwa, 
            from, 
            directUrl,
            fileName,
            caption,
            mek
          );
          
        } catch (error) {
          console.error("Send document error:", error);
          reply(`*❌ Failed to send movie:* ${error.message || "Unknown error"}`);
        }
      }
    }
  } catch (error) {
    console.error("Button handler error:", error);
  }
});

// ================= TEXT REPLY HANDLERS =================
// These handlers work for text replies (when BUTTON is false)

// Movie selection from text reply
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, {
    react: { text: "✅", key: m.key }
  });
  
  const index = parseInt(body) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];

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
  if (!downloadLinks.length) return reply("*❌ No download links found (<500MB)!*");

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
});

// Quality selection from text reply
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

  await danuwa.sendMessage(from, {
    react: { text: "✅", key: m.key }
  });
  
  const index = parseInt(body) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  reply(`*ඔයාගෙ ${selectedLink.quality} movie එක Vercel හරහා එවන්නම් ඉන්න 🙌*`);

  try {
    const directUrl = getDirectPixeldrainUrl(selectedLink.link);
    const fileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`.replace(/[^\w\s.-]/gi,'');
    
    const caption = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
*🚀 Method:* Vercel Serverless
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
    
    await streamViaVercel(
      danuwa, 
      from, 
      directUrl,
      fileName,
      caption,
      mek
    );
    
  } catch (error) {
    console.error("Send document error:", error);
    reply(`*❌ Failed to send movie:* ${error.message || "Unknown error"}`);
  }
});

/* ================= CLEANUP ================= */
setInterval(() => {
  const now = Date.now();
  const timeout = 10*60*1000;
  for (const s in pendingSearch) if (now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  for (const s in pendingQuality) if (now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
}, 5*60*1000);

module.exports = { pendingSearch, pendingQuality, VERCEL_URL };
