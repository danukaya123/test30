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

const pendingSelections = {}; // store reply contexts

// Helper to fetch modified download link
async function scrapeModifiedLink(url) {
    try {
        const response = await axios.get(url, { headers: headers1, maxRedirects: 5 });
        const $ = cheerio.load(response.data);
        let modifiedLink = $('#link').attr('href') || url;
        return modifiedLink
            .replace(".mp4?bot=cscloud2bot&code=", "?ext=mp4&bot=cscloud2bot&code=")
            .replace(".mp4", "?ext=mp4")
            .replace(".mkv?bot=cscloud2bot&code=", "?ext=mkv&bot=cscloud2bot&code=")
            .replace(".mkv", "?ext=mkv")
            .replace(".zip", "?ext=zip");
    } catch {
        return url;
    }
}

// Helper to fetch file size from the download page
async function fetchJsonData(data, url) {
    try {
        const response = await axios.post(url, data, { headers: { "Content-Type": "application/json" }, maxRedirects: 5 });
        const htmlResponse = await axios.get(url);
        const $ = cheerio.load(htmlResponse.data);
        const fileSize = $('p.file-info:contains("File Size") span').text().trim() || "Unknown";
        response.data.fileSize = fileSize;
        return response.data;
    } catch {
        return { url: null, fileSize: "Unknown" };
    }
}

// Fetch movie details and download links
async function getMovieDetailsAndDownloadLinks(query) {
    try {
        const searchResponse = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(query)}`, { headers: headers1 });
        const $ = cheerio.load(searchResponse.data);

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

        // Puppeteer to fetch download links
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent(headers1['User-Agent']);

        for (const film of films) {
            await page.goto(film.movieLink, { waitUntil: 'networkidle2' });
            await page.waitForSelector('tr.clidckable-rowdd', { timeout: 5000 }).catch(() => {});
            const downloadLinks = await page.$$eval('tr.clidckable-rowdd', rows =>
                rows.map(row => {
                    const link = row.getAttribute('data-href');
                    const tds = row.querySelectorAll('td');
                    const quality = tds[0]?.innerText?.trim() || null;
                    const size = tds[1]?.innerText?.trim() || null;
                    return link && quality && size ? { link, quality, size } : null;
                }).filter(Boolean)
            );
            film.downloadLinks = downloadLinks;
        }

        await browser.close();
        return films;
    } catch {
        return [];
    }
}

// Main command
cmd({
    pattern: "film",
    alias: ["movie", "cinesub"],
    use: ".film <query>",
    desc: "Search and download movies",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
    if (!q) return reply('🔎 Please provide a film name.');
    await m.react('🎬');

    const films = await getMovieDetailsAndDownloadLinks(q);
    if (films.length === 0) return reply('❌ No movies found.');

    // Send movie list
    let msgText = `🎬 *MOVIE RESULTS*\n\nReply with number to select:\n\n`;
    const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    films.forEach((film, i) => {
        const emojiIndex = (i+1).toString().split('').map(n => numberEmojis[n]).join('');
        msgText += `${emojiIndex} *${film.filmName}* (${film.year})\n`;
    });

    const sentMsg = await conn.sendMessage(from, { text: msgText });
    pendingSelections[sentMsg.key.id] = { stage: 'movieSelect', films, from, conn };
});

// Reply handler
module.exports.replyHandler = async (conn, msg) => {
    const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!stanzaId || !pendingSelections[stanzaId]) return;
    const data = pendingSelections[stanzaId];

    const selectedIndex = parseInt(msg.message.extendedTextMessage.text.trim()) - 1;
    if (selectedIndex < 0 || selectedIndex >= data.films.length) return;

    const film = data.films[selectedIndex];
    if (!film.downloadLinks || film.downloadLinks.length === 0) {
        return conn.sendMessage(data.from, { text: '⚠️ No download links available.' });
    }

    // Send quality options
    let qualityMsg = `📝 *Choose movie quality*\n\n`;
    const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    const jsonResponses = [];

    for (const [i, dl] of film.downloadLinks.entries()) {
        const emoji = (i+1).toString().split('').map(n => numberEmojis[n]).join('');
        const modified = await scrapeModifiedLink(dl.link);
        const jsonResp = await fetchJsonData({ direct: true }, modified);
        jsonResponses.push(jsonResp);
        qualityMsg += `${emoji} *${dl.quality} - ${jsonResp.fileSize}*\n`;
    }

    const sentQualMsg = await conn.sendMessage(data.from, { text: qualityMsg });
    pendingSelections[sentQualMsg.key.id] = { stage: 'qualitySelect', jsonResponses, film, from: data.from, conn };

    // Remove previous stage
    delete pendingSelections[stanzaId];
};

// Another reply handler for quality selection
module.exports.qualityHandler = async (conn, msg) => {
    const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!stanzaId || !pendingSelections[stanzaId]) return;
    const data = pendingSelections[stanzaId];

    const choice = parseInt(msg.message.extendedTextMessage.text.trim()) - 1;
    if (choice < 0 || choice >= data.jsonResponses.length) return;

    const file = data.jsonResponses[choice];
    if (!file.url) return conn.sendMessage(data.from, { text: '❌ Invalid selection.' });

    await conn.sendMessage(data.from, { document: { url: file.url }, mimetype: 'video/mp4', fileName: `${data.film.filmName}.mp4` });
    delete pendingSelections[stanzaId];
};
