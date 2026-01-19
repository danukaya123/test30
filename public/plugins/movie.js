const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const puppeteer = require("puppeteer");
const config = require("../config");

const pendingSearch = {};
const pendingQuality = {};

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
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  const results = await page.$$eval(".display-item .item-box", boxes =>
    boxes.slice(0, 10).map((box, index) => {
      const a = box.querySelector("a");
      const img = box.querySelector(".thumb");
      const lang = box.querySelector(".item-desc-giha .language")?.textContent || "";
      const quality = box.querySelector(".item-desc-giha .quality")?.textContent || "";
      const qty = box.querySelector(".item-desc-giha .qty")?.textContent || "";
      return {
        id: index + 1,
        title: a?.title?.trim() || "",
        movieUrl: a?.href || "",
        thumb: img?.src || "",
        language: lang.trim(),
        quality: quality.trim(),
        qty: qty.trim()
      };
    }).filter(m => m.title && m.movieUrl)
  );

  await browser.close();
  return results;
}

// ---------- Movie Metadata ----------
async function getMovieMetadata(url) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  const metadata = await page.evaluate(() => {
    const getText = el => el?.textContent.trim() || "";
    const getList = selector => Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    const title = getText(document.querySelector(".info-details .details-title h3"));
    let language = "", directors = [], stars = [];
    document.querySelectorAll(".info-col p").forEach(p => {
      const strong = p.querySelector("strong");
      if (!strong) return;
      const txt = strong.textContent.trim();
      if (txt.includes("Language:")) language = strong.nextSibling?.textContent?.trim() || "";
      if (txt.includes("Director:")) directors = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
      if (txt.includes("Stars:")) stars = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
    });
    return {
      title,
      language,
      duration: getText(document.querySelector(".data-views[itemprop='duration']")),
      imdb: getText(document.querySelector(".data-imdb"))?.replace("IMDb:", "").trim(),
      genres: getList(".details-genre a"),
      directors,
      stars,
      thumbnail: document.querySelector(".splash-bg img")?.src || ""
    };
  });

  await browser.close();
  return metadata;
}

// ---------- Pixeldrain Links ----------
async function getPixeldrainLinks(movieUrl) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 30000 });

  const rows = await page.$$eval(".link-pixeldrain tbody tr", trs =>
    trs.map(tr => {
      const a = tr.querySelector(".link-opt a");
      const quality = tr.querySelector(".quality")?.textContent.trim() || "";
      const size = tr.querySelector("td:nth-child(3) span")?.textContent.trim() || "";
      return { pageLink: a?.href || "", quality, size };
    })
  );

  const links = [];
  for (const l of rows) {
    try {
      const sub = await browser.newPage();
      await sub.goto(l.pageLink, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 12000));
      const finalUrl = await sub.$eval(".wait-done a[href^='https://pixeldrain.com/']", el => el.href).catch(() => null);
      if (finalUrl) {
        let sizeMB = 0;
        const sizeText = l.size.toUpperCase();
        if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
        else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
        if (sizeMB <= 2048) {
          links.push({ link: finalUrl, quality: normalizeQuality(l.quality), size: l.size });
        }
      }
      await sub.close();
    } catch {}
  }
  await browser.close();
  return links;
}

/* ================= COMMAND: MOVIE SEARCH ================= */
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema"],
  react: "🎬",
  desc: "Search SinhalaSub movies",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  if (!q) return reply(`*🎬 Movie Search Plugin*\nUsage: movie_name\nExample: movie avengers`);
  reply("*🔍 Searching for movies...*");

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

    const caption = `
╭─────── ⭓ ⭓ ⭓  ─────────╮
│       🎬 SEARCH RESULTS 🎬      │
╰──────────────⟡───────╯
Found ${searchResults.length} movies for "${q}".
Select a movie from the menu below:
`;

    await sendInteractiveMessage(danuwa, from, {
      text: caption,
      interactiveButtons,
      quoted: mek
    });

  } else {
    // -------- Plain Text Reply --------
    let text = "*🎬 Search Results:*\n";
    searchResults.forEach((m, i) => {
      text += `*${i+1}.* ${m.title}\n   📝 Language: ${m.language}\n   📊 Quality: ${m.quality}\n   🎞️ Format: ${m.qty}\n`;
    });
    text += `\n*Reply with movie number (1-${searchResults.length})*`;
    reply(text);
  }
});

/* ================= COMMAND: MOVIE SELECTION ================= */
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  const index = parseInt(body) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];

  reply("*🔄 Fetching movie metadata...*");
  const metadata = await getMovieMetadata(selected.movieUrl);

  let msg = `*🎬 ${metadata.title}*\n*📝 Language:* ${metadata.language}\n*⏱️ Duration:* ${metadata.duration}\n*⭐ IMDb:* ${metadata.imdb}\n*🎭 Genres:* ${metadata.genres.join(", ")}\n*🎥 Directors:* ${metadata.directors.join(", ")}\n*🌟 Stars:* ${metadata.stars.slice(0,5).join(", ")}${metadata.stars.length>5?"...":""}\n\n*🔄 Fetching download links...*`;

  if (metadata.thumbnail) {
    await danuwa.sendMessage(from, { image: { url: metadata.thumbnail }, caption: msg }, { quoted: mek });
  } else {
    await danuwa.sendMessage(from, { text: msg }, { quoted: mek });
  }

  // -------- Quality Selection --------
  const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
  if (!downloadLinks.length) return reply("*❌ No download links found (<2GB)!*");

  pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

  if (config.BUTTON) {
    // Buttons mode
    const buttons = downloadLinks.map((d, i) => ({ id: `${i+1}`, text: `🎞️ ${d.quality} (${d.size})` }));
    await sendButtons(danuwa, from, { text: "*📌 Select quality:*", footer: "Movie Downloader", buttons }, { quoted: mek });
  } else {
    // Plain text mode
    let text = "*📌 Available Qualities:*\n";
    downloadLinks.forEach((d, i) => {
      text += `${i+1}. ${d.quality} (${d.size})\n`;
    });
    text += `\n*Reply with the number (1-${downloadLinks.length})*`;
    reply(text);
  }
});

/* ================= COMMAND: QUALITY SELECTION ================= */
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  const index = parseInt(body) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];

  const selectedLink = movie.downloadLinks[index];
  reply(`*⬇️ Sending ${selectedLink.quality} movie as document...*`);

  try {
    const directUrl = getDirectPixeldrainUrl(selectedLink.link);
    await danuwa.sendMessage(from, {
      document: { url: directUrl },
      mimetype: "video/mp4",
      fileName: `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`.replace(/[^\w\s.-]/gi,''),
      caption: `*🎬 ${movie.metadata.title}*\n*📊 Quality:* ${selectedLink.quality}\n*💾 Size:* ${selectedLink.size}\n\n*Enjoy your movie! 🍿*`
    }, { quoted: mek });
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

module.exports = { pendingSearch, pendingQuality };
