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

const pendingSelections = {}; // stores messageId → { data, stage }

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

        // Puppeteer for download links
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent(headers1['User-Agent']);

        for (const film of films) {
            await page.goto(film.movieLink, { waitUntil: 'networkidle2' });
            await page.waitForSelector('tr.clidckable-rowdd', { timeout: 5000 }).catch(() => console.log('⚠️ No links table found'));
            const downloadLinks = await page.$$eval('tr.clidckable-rowdd', rows => 
                rows.map(row => {
                    const link = row.getAttribute('data-href');
                    const tds = row.querySelectorAll('td');
                    const quality = tds[0]?.innerText?.trim() || null;
                    const size = tds[1]?.innerText?.trim() || null;
                    const lang = tds[2]?.innerText?.trim() || null;
                    return link && quality && size ? { link, quality, size, lang } : null;
                }).filter(Boolean)
            );
            film.downloadLinks = downloadLinks;
        }

        await browser.close();
        return films;

    } catch (err) {
        console.error('❌ Error fetching movies:', err.message);
        return [];
    }
}

async function scrapeModifiedLink(url) {
    try {
        const response = await axios.get(url, { headers: headers1 });
        const $ = cheerio.load(response.data);
        let modifiedLink = $('#link').attr('href') || url;
        // Optional replacement logic
        return modifiedLink;
    } catch (err) {
        console.error('❌ Error scraping modified link:', err.message);
        return url;
    }
}

async function fetchJsonData(data, url) {
    try {
        const response = await axios.post(url, data, { headers: { 'Content-Type': 'application/json' } });
        const htmlResp = await axios.get(url);
        const $ = cheerio.load(htmlResp.data);
        const fileSize = $('p.file-info:contains("File Size") span').text().trim() || "Unknown";
        response.data.fileSize = fileSize;
        return response.data;
    } catch (err) {
        console.error('❌ Error fetching JSON:', err.message);
        return { url: null, fileSize: 'Unknown' };
    }
}

async function getTvSeriesSeasonsAndEpisodes(url) {
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent(headers1['User-Agent']);
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#episodes .se-c', { timeout: 5000 }).catch(() => console.log('⚠️ No episodes container found'));

        const seasons = await page.$$eval('#episodes .se-c', seasonElems => seasonElems.map((seasonElem, i) => {
            const seasonNumberElem = seasonElem.querySelector('.se-q .se-t');
            const seasonNumber = (seasonNumberElem?.innerText?.trim()) || `Season ${i+1}`;
            const episodeElems = seasonElem.querySelectorAll('ul.episodios li');
            const episodes = Array.from(episodeElems).map(epElem => {
                const a = epElem.querySelector('a.episode-link');
                const episodeUrl = a?.href || null;
                const episodeNumber = epElem.querySelector('.numerando')?.innerText?.trim() || null;
                const episodeTitle = epElem.querySelector('.episodiotitle')?.innerText?.trim() || null;
                const episodeImage = epElem.querySelector('img')?.src || null;
                return { episodeNumber, episodeTitle, episodeUrl, episodeImage };
            }).filter(ep => ep.episodeUrl);
            return { seasonNumber, episodes };
        }));

        await browser.close();
        return seasons;
    } catch (err) {
        console.error('❌ Error fetching TV series:', err.message);
        return [];
    }
}

// === Command ===
cmd({
    pattern: "film",
    alias: ["movie", "cinesub"],
    use: ".film <query>",
    desc: "Search and download movies or TV series",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q) return reply('🔎 Please provide a film name.');
        await m.react('🎬');

        const films = await getMovieDetailsAndDownloadLinks(q);
        if (!films.length) return reply('❌ No movies found.');

        // Build movie list message
        const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
        let movieListMsg = `🎬 *MOVIES FOUND* 🎬\n\n`;
        films.forEach((f, i) => {
            const emojiIndex = (i+1).toString().split('').map(n => numberEmojis[n]).join('');
            movieListMsg += `${emojiIndex} *${f.filmName}* (${f.year})\n`;
        });

        const sentMsg = await conn.sendMessage(from, { text: movieListMsg }, { quoted: m });
        pendingSelections[sentMsg.key.id] = { stage: 'movie', films, from };
    } catch (err) {
        console.error(err);
        reply('⚠️ An error occurred while fetching films.');
    }
});

// === Reply Handler ===
conn.ev.on('messages.upsert', async (msgUpdate) => {
    const msg = msgUpdate.messages[0];
    if (!msg.message || !msg.message.extendedTextMessage) return;

    const stanzaId = msg.message.extendedTextMessage.contextInfo?.stanzaId;
    if (!stanzaId || !pendingSelections[stanzaId]) return;

    const data = pendingSelections[stanzaId];
    const userInput = msg.message.extendedTextMessage.text.trim();
    const selectedIndex = parseInt(userInput) - 1;
    const { stage } = data;

    try {
        if (stage === 'movie') {
            if (selectedIndex < 0 || selectedIndex >= data.films.length) {
                return conn.sendMessage(data.from, { text: '❌ Invalid selection. Please reply with a valid number.' }, { quoted: msg });
            }

            const film = data.films[selectedIndex];

            // Filter download links
            const filteredDownloadLinks = (film.downloadLinks || []).filter(dl => !dl.quality.includes("Telegram"));
            if (!filteredDownloadLinks.length) {
                // Handle TV series
                const seasons = await getTvSeriesSeasonsAndEpisodes(film.movieLink);
                if (!seasons.length) return conn.sendMessage(data.from, { text: '❌ No episodes found for this TV series.' }, { quoted: msg });
                // TODO: Build season/episode selection (same reply pattern)
            } else {
                // Send quality options
                const numberEmojis1 = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
                let qualityMsg = `📝 Choose movie quality:\n\n`;
                const jsonResponses = [];

                for (const [i, dl] of filteredDownloadLinks.entries()) {
                    const emojiIndex = (i+1).toString().split('').map(n => numberEmojis1[n]).join('');
                    const modifiedLink = await scrapeModifiedLink(dl.link);
                    const jsonResp = await fetchJsonData({ direct: true }, modifiedLink);
                    jsonResponses.push(jsonResp);
                    qualityMsg += `${emojiIndex} *${dl.quality} - ${jsonResp.fileSize}*\n`;
                }

                const sentQualMsg = await conn.sendMessage(data.from, { text: qualityMsg }, { quoted: msg });
                pendingSelections[sentQualMsg.key.id] = { stage: 'quality', film, jsonResponses, from: data.from };
            }

            delete pendingSelections[stanzaId]; // remove old stage
        } else if (stage === 'quality') {
            const { jsonResponses, film } = data;
            if (selectedIndex < 0 || selectedIndex >= jsonResponses.length) {
                return conn.sendMessage(data.from, { text: '❌ Invalid selection. Please reply with a valid number.' }, { quoted: msg });
            }

            const chosenFile = jsonResponses[selectedIndex];
            if (!chosenFile.url) return conn.sendMessage(data.from, { text: '❌ Invalid file.' }, { quoted: msg });

            await conn.sendMessage(data.from, {
                document: { url: chosenFile.url },
                mimetype: "video/mp4",
                fileName: `${film.filmName}.mp4`,
                caption: `✅ Download ready: ${film.filmName} - ${chosenFile.fileSize}`
            }, { quoted: msg });

            delete pendingSelections[stanzaId]; // clean up
        }
    } catch (err) {
        console.error(err);
        conn.sendMessage(data.from, { text: '⚠️ An error occurred during processing.' }, { quoted: msg });
        delete pendingSelections[stanzaId];
    }
});
