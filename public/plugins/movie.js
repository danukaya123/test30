const { cmd, commands } = require('../command')
const axios = require('axios');
const cheerio = require('cheerio');

const headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};


async function getMovieDetailsAndDownloadLinks(query) {
  try {
    const response = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(query)}`, { headers1, maxRedirects: 5 });
    const html = response.data;
    const $ = cheerio.load(html);
    const films = [];
    $('article').each((i, element) => {
      const filmName = $(element).find('.details .title a').text().trim();
      const imageUrl = $(element).find('.image .thumbnail img').attr('src');
      const description = $(element).find('.details .contenido p').text().trim();
      const year = $(element).find('.details .meta .year').text().trim();
      const imdbText = $(element).find('.details .meta .rating:first').text().trim();
      const imdb = imdbText.replace('IMDb', '').trim();
      const movieLink = $(element).find('.image .thumbnail a').attr('href');
      films.push({ filmName, imageUrl, description, year, imdb, movieLink });
    });
    for (const film of films) {
      const moviePageResponse = await axios.get(film.movieLink, { headers1, maxRedirects: 5 });
      const moviePageHtml = moviePageResponse.data;
      const $$ = cheerio.load(moviePageHtml);
      const downloadLinks = [];

$$('tr.clidckable-rowdd').each((i, el) => {
  const link = $$(el).attr('data-href');
  const quality = $$(el).find('td').eq(0).text().trim();
  const size = $$(el).find('td').eq(1).text().trim();
  const lang = $$(el).find('td').eq(2).text().trim(); // optional

  if (link && quality && size) {
    downloadLinks.push({ link, quality, size, lang });
  }
});
      film.downloadLinks = downloadLinks;
    }
    return films;
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    return [];
  }
}


async function scrapeModifiedLink(url) {
  try {
    const response = await axios.get(url, { headers1, maxRedirects: 5 });
    const $ = cheerio.load(response.data);
    let modifiedLink = $('#link').attr('href');
    if (!modifiedLink) {
      console.log("⚠️ Modified link not found!");
      return url; 
    }
    const urlMappings = [
      { search: ["https://google.com/server11/1:/", "https://google.com/server12/1:/", "https://google.com/server13/1:/"], replace: "https://drive2.cscloud12.online/server1/" },
      { search: ["https://google.com/server21/1:/", "https://google.com/server22/1:/", "https://google.com/server23/1:/"], replace: "https://drive2.cscloud12.online/server2/" },
      { search: ["https://google.com/server3/1:/"], replace: "https://drive2.cscloud12.online/server3/" },
      { search: ["https://google.com/server4/1:/"], replace: "https://drive2.cscloud12.online/server4/" }
    ];
    urlMappings.forEach(mapping => {
      mapping.search.forEach(searchUrl => {
        if (modifiedLink.includes(searchUrl)) {
          modifiedLink = modifiedLink.replace(searchUrl, mapping.replace);
        }
      });
    });
        modifiedLink = modifiedLink.replace(".mp4?bot=cscloud2bot&code=", "?ext=mp4&bot=cscloud2bot&code=")
                               .replace(".mp4", "?ext=mp4")
                               .replace(".mkv?bot=cscloud2bot&code=", "?ext=mkv&bot=cscloud2bot&code=")
                               .replace(".mkv", "?ext=mkv")
                               .replace(".zip", "?ext=zip");
    return modifiedLink;
  } catch (error) {
    console.error("❌ Error fetching the page:", error.message);
    return url; 
  }
}


async function fetchJsonData(data, url) { try { const response = await axios.post(url, data, { headers: { "Content-Type": "application/json" }, maxRedirects: 5 });
const htmlResponse = await axios.get(url);
const $ = cheerio.load(htmlResponse.data);
const fileSize = $('p.file-info:contains("File Size") span').text().trim();
response.data.fileSize = fileSize || "Unknown";
return response.data;
} catch (error) { console.error("❌ Error fetching JSON data:", error.message); return { error: error.message }; } }


cmd({
  pattern: "film",
  alias: ["movie","cinesub"],
  use: ".film <query>",
  desc: "Search and download movies",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
  try {
    if (!q) return reply('🔎 Please provide a film name.');
    
    await m.react('🎬');

    
    const os = require('os');
    let hostname;
    const hostNameLength = os.hostname().length;
    
    if (hostNameLength === 12) {
      hostname = "𝚁𝙴𝙿𝙻𝙸𝚃";
    } else if (hostNameLength === 36) {
      hostname = "𝙷𝙴𝚁𝙾𝙺𝚄";
    } else if (hostNameLength === 8) {
      hostname = "𝙺𝙾𝚈𝙴𝙱";
    } else {
      hostname = "𝚅𝙿𝚂 || 𝚄𝙽𝙺𝙽𝙾𝚆𝙽";
    }


                
    const films = await getMovieDetailsAndDownloadLinks(q);
    
    if (films.length === 0) {
      return reply('❌ No movies found for your query.');
    }


let filmListMessage = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗠𝗢𝗩𝗜𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 𝗥𝗘𝗣𝗟𝗬 𝗧𝗢 NUMBER❕  
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯
─────────────────────────

`;
const numberEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

films.forEach((film, index) => {
  let adjustedIndex = index + 1; 
  let emojiIndex = adjustedIndex.toString().split("").map(num => numberEmojis[num]).join("");
  filmListMessage += `${emojiIndex} *${film.filmName}*
  
`;
});


    const sentMessage = await conn.sendMessage(from, { 
image:{url: "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true"},
    caption: `${filmListMessage}`,

        }, { quoted: mek });
    
    await conn.sendMessage(from, { react: { text: "✅", key: sentMessage.key } });
            
        conn.ev.on('messages.upsert', async (msgUpdate) => {
      const msg = msgUpdate.messages[0];
      if (!msg.message || !msg.message.extendedTextMessage) return;

      const selectedOption = msg.message.extendedTextMessage.text.trim();

      if (msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {
        const selectedIndex = parseInt(selectedOption.trim()) - 1;

        if (selectedIndex >= 0 && selectedIndex < films.length) {

  await conn.sendMessage(from, { react: { text: "❤️", key: msg.key } });
          

                                                                      const film = films[selectedIndex];

let filmDetailsMessage = `─────────────────────────        
🎬  *${film.filmName}*  (${film.year})
─────────────────────────
⭐️  *IMDb Rating:* ${film.imdb}
📝  *Description:*
${film.description}

`;


const filteredDownloadLinks = film.downloadLinks.filter(dl => !dl.quality.includes("Telegram"));

let jsonResponses = []; 

if (filteredDownloadLinks.length > 0) {
    filmDetailsMessage += `─────────────────────────
📝CHOOSE MOVIE QUALITY❕👀
─────────────────────────
    
`;

    const numberEmojis1 = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

    for (const [index, dl] of filteredDownloadLinks.entries()) {
        const emojiIndex1 = (index + 1).toString().split("").map(num => numberEmojis1[num]).join(""); 

        const modifiedLink = await scrapeModifiedLink(dl.link);
        const jsonResponse = await fetchJsonData({ direct: true }, modifiedLink);

jsonResponses.push(jsonResponse);

        if (!jsonResponse.url) continue; 
        let cleanedQuality = dl.quality.replace(/(SD|HD|BluRay|FHD|WEBRip|WEB-DL|WEBDL|Direct)/gi, "").trim(); 

filmDetailsMessage += `${emojiIndex1} *${cleanedQuality} - ${jsonResponse.fileSize}*
`;
      
     }
} 

const sentMessage1 = await conn.sendMessage(from, { 
image:{url: `${film.imageUrl}`},
    caption: `${filmDetailsMessage}`,

        }, { quoted: msg });

await conn.sendMessage(from, { react: { text: "✅", key: sentMessage1.key } });



conn.ev.on('messages.upsert', async (msgUpdate) => {
    const msg1 = msgUpdate.messages[0];
    if (!msg1.message || !msg1.message.extendedTextMessage) return;

    const selectedOption = msg1.message.extendedTextMessage.text.trim();

    if (msg1.message.extendedTextMessage.contextInfo && msg1.message.extendedTextMessage.contextInfo.stanzaId === sentMessage1.key.id) {
        const selectedIndex1 = parseInt(selectedOption) - 1;

        if (selectedIndex1 >= 0 && selectedIndex1 < jsonResponses.length) {

await conn.sendMessage(from, { react: { text: "⬇️", key: msg1.key } });

           
  if (!jsonResponses[selectedIndex1].url) {
    await conn.sendMessage(from, { react: { text: "❌", key: msg1.key } });
    await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg1 });
    return;
}          
             

if (["𝙷𝙴𝚁𝙾𝙺𝚄", "𝙺𝙾𝚈𝙴𝙱"].includes(hostname)) {
    await conn.sendMessage(from, { react: { text: "⭕", key: msg1.key } });
    await conn.sendMessage(from, { text: `⭕ *Cannot send large files on ${hostname}.*
    
    ⚠️ This platform has restrictions on sending large media files. Please use a VPS or a suitable server.` }, { quoted: msg1 });
    return;
}


const downloadingMsg = await conn.sendMessage(from, {
  text: "📥 *Starting download...*",
  quoted: msg1
});

let sizeStr = jsonResponses[selectedIndex1].fileSize.replace(/[^\d.]/g, '');
let isGB = jsonResponses[selectedIndex1].fileSize.toUpperCase().includes("GB");
let fileSizeMB = parseFloat(sizeStr) * (isGB ? 1024 : 1);

// ⏱ Set duration based on file size
let totalProgressTime = 20000;
if (fileSizeMB > 2000) totalProgressTime = 35000;
else if (fileSizeMB > 1000) totalProgressTime = 25000;
else if (fileSizeMB > 500) totalProgressTime = 20000;
else totalProgressTime = 10000;

// 🧱 Progress bar setup
const barText = "DANUWA-MD MOVIE DOWNLOADER";
const totalSteps = barText.length;
const delayPerStep = Math.floor(totalProgressTime / totalSteps);
const spinner = ["⏳", "⌛", "⏱️", "🕐"];
const rocket = "🚀";

// ETA helper
function formatETA(ms) {
  return `${Math.ceil(ms / 1000)}s`;
}

// 📨 Initial blank bar
let visualProgressMsg = await conn.sendMessage(from, {
text: `*⚡ Downloading*: [${"⬜".repeat(totalSteps)}] 0%
🎞️ *${film.filmName}*
💾 Size: ${jsonResponses[selectedIndex1].fileSize}
⏳ ETA: ${formatETA(totalProgressTime)} ${spinner[0]}`
,
  quoted: msg1
});

// 🔁 Animate revealing text
for (let step = 1; step <= totalSteps; step++) {
  const percent = Math.floor((step / totalSteps) * 100);
  const spin = spinner[step % spinner.length];
  const eta = formatETA(delayPerStep * (totalSteps - step));

  const bar = barText
    .split("")
    .map((char, i) => {
      if (i < step - 1) return char;
      if (i === step - 1) return rocket;
      return "⬜";
    })
    .join("");

  await new Promise(res => setTimeout(res, delayPerStep));
  await conn.sendMessage(from, {
    edit: visualProgressMsg.key,
text: `📥 Downloading: [${bar}] ${percent}%
🎞️ *${film.filmName}*
💾 Size: ${jsonResponses[selectedIndex1].fileSize}
⏳ ETA: ${eta} ${spin}`
  });
}

// ✅ Final message
await new Promise(res => setTimeout(res, 1000));
await conn.sendMessage(from, {
  edit: visualProgressMsg.key,
text: `✅ *Download complete! Sending file...*
🎞️ *${film.filmName}*`
});


          
await conn.sendMessage(from, { 
    document: { url: `${jsonResponses[selectedIndex1].url}` }, 
    mimetype: "video/mp4", 
    fileName: `${film.filmName}.mp4`,
caption: `╭━[ *✅DOWNLOAD COMPLETE✅* ]━⬣
┃━━━━━━━━━━━━━━━━━━━━━━━⬣
┃ 🎬 *${film.filmName}*
┃ 📅 *Year:* ${film.year}
┃ ⭐ *IMDb:* ${film.imdb}
┃ 💾 *Size:* ${jsonResponses[selectedIndex1].fileSize}
┃━━━━━━━━━━━━━━━━━━━━━━━⬣ 
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯
`,
},{ quoted: msg1 });


await conn.sendMessage(from, { react: { text: "✅", key: msg1.key } });

        } else {
            await conn.sendMessage(from, { react: { text: "❌", key: msg1.key } });
            await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg1 });
        }
    }
});                                                                                                                                   } else {
            await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await conn.sendMessage(from, { text: "❌ Invalid selection. Please select a valid number." }, { quoted: msg });
        }
      }
    });

  } catch (error) {
    console.error(error);
    reply('⚠️ An error occurred while searching for films.');
  }
});
