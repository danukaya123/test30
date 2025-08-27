const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};

const channelJid = '120363418166326365@newsletter';
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const channelInvite = '0029Vb65OhH7oQhap1fG1y3o';

// ===== Puppeteer: Scrape download qualities =====
async function scrapeQualitiesWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox","--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("tr.clidckable-rowdd");

  const qualities = await page.$$eval("tr.clidckable-rowdd", rows =>
    rows.map((row, i) => {
      const quality = row.querySelector("td:nth-child(1)")?.innerText.trim();
      const size = row.querySelector("td:nth-child(2)")?.innerText.trim();
      const lang = row.querySelector("td:nth-child(3)")?.innerText.trim();
      const link = row.getAttribute("data-href");
      return { index: i + 1, quality, size, lang, link };
    })
  );

  await browser.close();
  return qualities;
}

// ===== Puppeteer: Scrape TV series episodes =====
async function scrapeTvEpisodesWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox","--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const seasons = await page.$$eval('#episodes .se-c', seasonElems =>
    seasonElems.map((seasonElem, i) => {
      const seasonNumber = seasonElem.querySelector('.se-q .se-t')?.innerText.trim() || `Season ${i+1}`;
      const episodes = Array.from(seasonElem.querySelectorAll('ul.episodios li')).map((epElem) => {
        const a = epElem.querySelector('a.episode-link');
        const episodeUrl = a?.href;
        const episodeNumber = epElem.querySelector('.numerando')?.innerText.trim();
        const episodeTitle = epElem.querySelector('.episodiotitle')?.innerText.trim();
        const episodeImage = epElem.querySelector('img')?.src;
        return { episodeNumber, episodeTitle, episodeUrl, episodeImage };
      });
      return { seasonNumber, episodes };
    })
  );

  await browser.close();
  return seasons;
}

// ===== Existing helpers =====
async function scrapeModifiedLink(url) {
  try {
    const response = await axios.get(url, { headers: headers1, maxRedirects: 5 });
    const $ = cheerio.load(response.data);
    let modifiedLink = $('#link').attr('href') || url;
    const urlMappings = [
      { search: ["https://google.com/server11/1:/","https://google.com/server12/1:/","https://google.com/server13/1:/"], replace: "https://drive2.cscloud12.online/server1/" },
      { search: ["https://google.com/server21/1:/","https://google.com/server22/1:/","https://google.com/server23/1:/"], replace: "https://drive2.cscloud12.online/server2/" },
      { search: ["https://google.com/server3/1:/"], replace: "https://drive2.cscloud12.online/server3/" },
      { search: ["https://google.com/server4/1:/"], replace: "https://drive2.cscloud12.online/server4/" }
    ];
    urlMappings.forEach(mapping => {
      mapping.search.forEach(searchUrl => { if(modifiedLink.includes(searchUrl)) modifiedLink = modifiedLink.replace(searchUrl, mapping.replace); });
    });
    modifiedLink = modifiedLink.replace(".mp4?bot=cscloud2bot&code=", "?ext=mp4&bot=cscloud2bot&code=")
                               .replace(".mp4", "?ext=mp4")
                               .replace(".mkv?bot=cscloud2bot&code=", "?ext=mkv&bot=cscloud2bot&code=")
                               .replace(".mkv", "?ext=mkv")
                               .replace(".zip", "?ext=zip");
    return modifiedLink;
  } catch (error) {
    console.error("❌ Error fetching modified link:", error.message);
    return url;
  }
}

async function fetchJsonData(data, url) {
  try {
    const response = await axios.post(url, data, { headers: { "Content-Type": "application/json" }, maxRedirects: 5 });
    const htmlResponse = await axios.get(url);
    const $ = cheerio.load(htmlResponse.data);
    const fileSize = $('p.file-info:contains("File Size") span').text().trim();
    response.data.fileSize = fileSize || "Unknown";
    return response.data;
  } catch (error) { console.error("❌ Error fetching JSON data:", error.message); return { error: error.message }; }
}

// ===== Search movies and send messages =====
cmd({
  pattern: "film",
  alias: ["movie","cinesub"],
  use: ".film <query>",
  desc: "Search and download movies",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply('🔎 Please provide a film name.');
    await m.react('🎬');

    const os = require('os');
    let hostname;
    const hostNameLength = os.hostname().length;
    if (hostNameLength === 12) hostname = "𝚁𝙴𝙿𝙻𝙸𝚃";
    else if (hostNameLength === 36) hostname = "𝙷𝙴𝚁𝙾𝙺𝚄";
    else if (hostNameLength === 8) hostname = "𝙺𝙾𝚈𝙴𝙱";
    else hostname = "𝚅𝙿𝚂 || 𝚄𝙽𝙺𝙽𝙾𝚆𝙽";

    // ===== Fetch movie list =====
    const response = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(q)}`, { headers: headers1 });
    const $ = cheerio.load(response.data);
    const films = [];
    $('article').each((i, el) => {
      const filmName = $(el).find('.details .title a').text().trim();
      const imageUrl = $(el).find('.image .thumbnail img').attr('src');
      const description = $(el).find('.details .contenido p').text().trim();
      const year = $(el).find('.details .meta .year').text().trim();
      const imdbText = $(el).find('.details .meta .rating:first').text().trim();
      const imdb = imdbText.replace('IMDb','').trim();
      const movieLink = $(el).find('.image .thumbnail a').attr('href');
      films.push({ filmName,imageUrl,description,year,imdb,movieLink });
    });

    if(films.length===0) return reply('❌ No movies found.');

    // ===== Movie selection message =====
    const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    let filmListMessage = "╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗\n";
    filmListMessage += "║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║\n";
    filmListMessage += "╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝\n📂 𝗠𝗢𝗩𝗜𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 📂\n";
    films.forEach((film,index)=>{
      const emojiIndex = (index+1).toString().split('').map(n=>numberEmojis[n]).join('');
      filmListMessage += `${emojiIndex} *${film.filmName}*\n\n`;
    });

    const sentMessage = await conn.sendMessage(from,{
      image:{url:"https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true"},
      caption: filmListMessage
    },{quoted:m});
    await conn.sendMessage(from,{react:{text:"✅",key:sentMessage.key}});

    // ===== Handle movie selection =====
    conn.ev.on('messages.upsert', async msgUpdate=>{
      const msg = msgUpdate.messages[0];
      if(!msg.message || !msg.message.extendedTextMessage) return;
      if(msg.message.extendedTextMessage.contextInfo?.stanzaId!==sentMessage.key.id) return;

      const selectedIndex = parseInt(msg.message.extendedTextMessage.text.trim())-1;
      if(selectedIndex<0||selectedIndex>=films.length) return;

      const film = films[selectedIndex];
      await conn.sendMessage(from,{react:{text:"❤️",key:msg.key}});

      // ===== Scrape download links with Puppeteer =====
      film.downloadLinks = await scrapeQualitiesWithPuppeteer(film.movieLink);

      if(!film.downloadLinks || film.downloadLinks.length===0){
        // Fallback to TV series episodes
        const seasons = await scrapeTvEpisodesWithPuppeteer(film.movieLink);
        // ===== Handle TV series selection here (optional) =====
        return;
      }

      // ===== Movie qualities selection message =====
      let linkMsg = `╔═══════════════════════╗\n`;
      linkMsg += `║     *📣 DOWNLOAD QUALITY 📣*     ║\n`;
      linkMsg += `╚═══════════════════════╝\n🎬  *${film.filmName}*\n─────────────────────────\n`;
      linkMsg += `*📝CHOOSE MOVIE QUALITY❕👀*\n─────────────────────────\n`;

      const epJsonResponses = [];
      for(let i=0;i<film.downloadLinks.length;i++){
        const emoji = (i+1).toString().split('').map(n=>numberEmojis[n]).join('');
        const modified = await scrapeModifiedLink(film.downloadLinks[i].link);
        const jsonResp = await fetchJsonData({direct:true},modified);
        epJsonResponses.push(jsonResp);
        linkMsg += `${emoji} *${film.downloadLinks[i].quality} - ${jsonResp.fileSize}*\n`;
      }

      const sentQualMsg = await conn.sendMessage(from,{image:{url:film.imageUrl},caption:linkMsg},{quoted:msg});
      await conn.sendMessage(from,{react:{text:"✅",key:sentQualMsg.key}});

      // ===== Handle quality selection =====
      conn.ev.on('messages.upsert', async msgUpdate3=>{
        const msg3 = msgUpdate3.messages[0];
        if(!msg3.message || !msg3.message.extendedTextMessage) return;
        if(msg3.message.extendedTextMessage.contextInfo?.stanzaId!==sentQualMsg.key.id) return;

        const choice = parseInt(msg3.message.extendedTextMessage.text.trim());
        const chosenFile = epJsonResponses[choice-1];
        if(!chosenFile?.url) return conn.sendMessage(from,{text:"❌ Invalid quality."},{quoted:msg3});

        await conn.sendMessage(from,{react:{text:"❤️",key:msg3.key}});
        await conn.sendMessage(from,{
          document:{url:chosenFile.url,mimetype:"video/mp4",fileName:`${film.filmName}.mp4`},
          caption:`✅ Download Complete: ${film.filmName}`
        },{quoted:msg3});
      });
    });

  } catch(error){
    console.error(error);
    reply('⚠️ An error occurred while searching for films.');
  }
});
