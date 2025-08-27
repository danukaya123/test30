const { cmd } = require('../command');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://google.com',
};

const channelJid = '120363418166326365@newsletter';
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';

async function getMovies(query) {
    try {
        const res = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(query)}`, { headers });
        const $ = cheerio.load(res.data);
        const films = [];

        $('article').each((i, el) => {
            const filmName = $(el).find('.details .title a').text().trim();
            const imageUrl = $(el).find('.image .thumbnail img').attr('src');
            const movieLink = $(el).find('.image .thumbnail a').attr('href');
            const year = $(el).find('.details .meta .year').text().trim();
            const imdbText = $(el).find('.details .meta .rating:first').text().trim();
            const imdb = imdbText.replace('IMDb', '').trim();
            const description = $(el).find('.details .contenido p').text().trim();

            if (filmName && movieLink) {
                films.push({ filmName, imageUrl, movieLink, year, imdb, description });
            }
        });

        return films;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function scrapeQualitiesWithPuppeteer(url) {
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for the table rows
    await page.waitForSelector("tr.clidckable-rowdd", { timeout: 10000 }).catch(() => null);

    const qualities = await page.$$eval("tr.clidckable-rowdd", rows =>
        rows.map((row, i) => {
            const quality = row.querySelector("td:nth-child(1)")?.innerText.trim() || "Unknown";
            const size = row.querySelector("td:nth-child(2)")?.innerText.trim() || "Unknown";
            const lang = row.querySelector("td:nth-child(3)")?.innerText.trim() || "Unknown";
            const link = row.getAttribute("data-href") || null;
            return { index: i + 1, quality, size, lang, link };
        })
    );

    await browser.close();
    return qualities.filter(q => q.link);
}

cmd({
    pattern: "film",
    alias: ["movie", "cinesub"],
    desc: "Search and download movies from cinesubz.lk",
    category: "download",
    react: "🎬"
}, async (robin, mek, m, { from, q, reply }) => {
    if (!q) return reply("🔍 Provide a movie name to search.");

    // 1️⃣ Search for movies
    const films = await getMovies(q);
    if (!films.length) return reply("❌ No movies found.");

    let listText = `🎬 *Search Results:*\n\n`;
    films.forEach((f, i) => {
        listText += `${i + 1}. *${f.filmName}* (${f.year})\n`;
    });
    listText += `\n👉 Reply with the number to choose a movie.`;

    await reply(listText);

    // 2️⃣ Wait for user reply
    robin.ev.once('messages.upsert', async (msg) => {
        try {
            const userMsg = msg.messages[0];
            const selectedIndex = parseInt(userMsg.message.conversation?.trim()) - 1;
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= films.length) {
                return robin.sendMessage(from, { text: "❌ Invalid selection." }, { quoted: mek });
            }

            const film = films[selectedIndex];

            // 3️⃣ Scrape qualities using Puppeteer
            const qualities = await scrapeQualitiesWithPuppeteer(film.movieLink);
            if (!qualities.length) return robin.sendMessage(from, { text: "❌ No download qualities found." }, { quoted: mek });

            let qualityText = `🎬 *${film.filmName}* - Select Quality:\n\n`;
            qualities.forEach(q => {
                qualityText += `${q.index}. *${q.quality}* (${q.size}, ${q.lang})\n`;
            });
            qualityText += `\n👉 Reply with the number to download.`;

            await robin.sendMessage(from, { text: qualityText }, { quoted: mek });

            // 4️⃣ Wait for user to select quality
            robin.ev.once('messages.upsert', async (msg2) => {
                try {
                    const userMsg2 = msg2.messages[0];
                    const selectedQualityIndex = parseInt(userMsg2.message.conversation?.trim()) - 1;
                    if (isNaN(selectedQualityIndex) || selectedQualityIndex < 0 || selectedQualityIndex >= qualities.length) {
                        return robin.sendMessage(from, { text: "❌ Invalid selection." }, { quoted: mek });
                    }

                    const chosen = qualities[selectedQualityIndex];

                    // 5️⃣ Go to final download page
                    const browser2 = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
                    const page2 = await browser2.newPage();
                    await page2.goto(chosen.link, { waitUntil: "networkidle2" });

                    await page2.waitForSelector("a#dwnbtn, a[href*='download']", { timeout: 20000 });
                    const finalUrl = await page2.$eval("a#dwnbtn, a[href*='download']", el => el.href);
                    await browser2.close();

                    // 6️⃣ Send final download link
                    await robin.sendMessage(from, {
                        text: `✅ *${chosen.quality}* (${chosen.size})\n\n🔗 Download: ${finalUrl}`
                    }, { quoted: mek });

                } catch (err) {
                    console.error(err);
                    robin.sendMessage(from, { text: "⚠️ Failed to get final download link." }, { quoted: mek });
                }
            });

        } catch (err) {
            console.error(err);
            robin.sendMessage(from, { text: "⚠️ Failed to fetch movie qualities." }, { quoted: mek });
        }
    });
});
