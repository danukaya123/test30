const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const http = require("http");
const config = require("../config");

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵWA－ 〽️Ｄ 🍁';
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

// ---------- Movie Search ----------
async function searchMovies(query) {
  const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
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
      headers: { 'User-Agent': 'Mozilla/5.0' }
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
        if (txt.includes("Language:")) language = $(strong[0].nextSibling).text().trim();
        if (txt.includes("Director:")) $p.find("a").each((j, a) => directors.push($(a).text().trim()));
        if (txt.includes("Stars:")) $p.find("a").each((j, a) => stars.push($(a).text().trim()));
      }
    });

    const duration = $(".data-views[itemprop='duration']").text().trim();
    const imdb = $(".data-imdb").text().replace("IMDb:", "").trim();
    const genres = [];
    $(".details-genre a").each((i, a) => genres.push($(a).text().trim()));
    const thumbnail = $(".splash-bg img").attr("src") || "";

    return { title, language, duration, imdb, genres, directors, stars, thumbnail };
  } catch (error) {
    console.error("Metadata error:", error.message);
    return { title:"", language:"", duration:"", imdb:"", genres:[], directors:[], stars:[], thumbnail:"" };
  }
}

// ---------- Pixeldrain Links ----------
async function getPixeldrainLinks(movieUrl) {
  try {
    const { data } = await axios.get(movieUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    const rows = [];

    $(".link-pixeldrain tbody tr").each((i, tr) => {
      const $tr = $(tr);
      const a = $tr.find(".link-opt a");
      const quality = $tr.find(".quality").text().trim() || "";
      const size = $tr.find("td:nth-child(3) span").text().trim() || "";
      if (a.attr("href")) rows.push({ pageLink: a.attr("href"), quality, size });
    });

    const links = [];
    for (const l of rows.slice(0, 3)) {
      try {
        const { data: pageData } = await axios.get(l.pageLink, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': movieUrl }
        });
        const $$ = cheerio.load(pageData);
        const finalUrl = $$(".wait-done a[href^='https://pixeldrain.com/']").attr("href");

        if (finalUrl) {
          let sizeMB = 0;
          const sizeText = l.size.toUpperCase();
          if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText)*1024;
          else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);

          if (sizeMB <= 2048) { // Limit to 2GB
            links.push({ link: finalUrl, quality: normalizeQuality(l.quality), size: l.size });
          }
        }
      } catch(err){ console.error("Link processing error:", err.message); }
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
  if (!q) return reply("*🎬 Movie Search Plugin*\nUsage: movie_name");

  const searchResults = await searchMovies(q);
  if (!searchResults.length) return reply("*❌ No movies found!*");
  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

  const rows = searchResults.map((movie, i) => ({
    id: `${i+1}`,
    title: movie.title,
    description: `Language: ${movie.language} | Quality: ${movie.quality} | Format: ${movie.qty}`
  }));

  const interactiveButtons = [
    { name: "single_select", buttonParamsJson: JSON.stringify({ title: "Movie Search Results", sections: [{ title:"Select a movie", rows }] }) }
  ];

  const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮUWA－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
📂 𝗠𝗢𝗩𝗜𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 📂  
💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*`;

  await danuwa.sendMessage(from, { image:{ url:imageUrl } }, { quoted: mek });
  await sendInteractiveMessage(danuwa, from, { text: caption, interactiveButtons, quoted: mek });
});

// ================= COMMAND: MOVIE SELECTION =================
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  await danuwa.sendMessage(from, { react:{ text:"✅", key:m.key } });

  const index = parseInt(body)-1;
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

  if(metadata.thumbnail){
    await danuwa.sendMessage(from, { image:{ url:metadata.thumbnail }, caption:msg }, { quoted: mek });
  } else { await danuwa.sendMessage(from, { text:msg }, { quoted: mek }); }

  // -------- Quality Selection --------
  const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
  if (!downloadLinks.length) return reply("*❌ No download links (<2GB) found!*");
  pendingQuality[sender] = { movie:{ metadata, downloadLinks }, timestamp: Date.now() };

  if(config.BUTTON){
    const buttons = downloadLinks.map((d,i)=>({ id:`${i+1}`, text:`💡 ${d.quality} (${d.size})` }));
    await sendButtons(danuwa, from, { text:"─────────────────────────\n *📝CHOOSE MOVIE QUALITY❕👀*\n────────────────────────", buttons }, { quoted: mek });
  } else {
    let text = "─────────────────────────\n📝CHOOSE MOVIE QUALITY❕👀\n────────────────────────\n";
    downloadLinks.forEach((d,i)=>{ text += `${i+1}. ${d.quality} (${d.size})\n`; });
    text += `\n*Reply with the number (1-${downloadLinks.length})*`;
    reply(text);
  }
});

// ================= COMMAND: QUALITY SELECTION =================
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  await danuwa.sendMessage(from, { react:{ text:"✅", key:m.key } });

  const index = parseInt(body)-1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  reply(`*ඔයාගෙ ${selectedLink.quality} movie එක Document එකක් විදියට එවන්නම් 🙌*`);

  try {
    const directUrl = getDirectPixeldrainUrl(selectedLink.link);
    const sizeText = selectedLink.size.toUpperCase();
    let sizeMB = 0;
    if(sizeText.includes("GB")) sizeMB = parseFloat(sizeText)*1024;
    else if(sizeText.includes("MB")) sizeMB = parseFloat(sizeText);

    if(sizeMB > 2048) return reply("*❌ Movie too big (>2GB). Download manually:* " + directUrl);

    await danuwa.sendMessage(from, {
      document:{ url:directUrl, mimetype:"video/mp4", fileName:`${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`.replace(/[^\w\s.-]/gi,'') },
      caption:`───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
─────────────────────────        
🚀 Pow. By *DANUKA DISANAYAKA* 🔥`,
      contextInfo:{ forwardingScore:999, isForwarded:true, forwardedNewsletterMessageInfo:{ newsletterJid:channelJid, newsletterName:channelName, serverMessageId:-1 } }
    }, { quoted: mek });

  } catch(err){
    console.error("Send document error:", err);
    reply(`*❌ Failed to send movie:* ${err.message || "Unknown error"}`);
  }
});

// ================= CLEANUP =================
setInterval(()=>{
  const now = Date.now();
  const timeout = 10*60*1000;
  for(const s in pendingSearch) if(now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  for(const s in pendingQuality) if(now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
}, 5*60*1000);

module.exports = { pendingSearch, pendingQuality };
