const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const os = require('os');

const headers1 = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};

const channelJid = '120363418166326365@newsletter';
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';

const sessionStates = new Map();

function toEmojiNumber(n) {
  const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
  return n.toString().split('').map(d => numberEmojis[d] || d).join('');
}

async function getMovieDetailsAndDownloadLinks(query) {
  try {
    const resp = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(query)}`, {
      headers: headers1, maxRedirects: 5
    });
    const $ = cheerio.load(resp.data);
    const films = [];

    $('article').each((_, el) => {
      const filmName = $(el).find('.details .title a').text().trim();
      const imageUrl = $(el).find('.image .thumbnail img').attr('src');
      const description = $(el).find('.details .contenido p').text().trim();
      const year = $(el).find('.details .meta .year').text().trim();
      const imdb = $(el).find('.details .meta .rating:first').text().replace('IMDb', '').trim();
      const movieLink = $(el).find('.image .thumbnail a').attr('href');

      if (filmName && movieLink) {
        films.push({ filmName, imageUrl, description, year, imdb, movieLink });
      }
    });

    return films;
  } catch (e) {
    console.error('Error fetching film list:', e);
    return [];
  }
}

async function fetchQualityOptions(url) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('tr.clidckable-rowdd');

    const qualities = await page.$$eval('tr.clidckable-rowdd', rows =>
      rows.map((row, i) => {
        const quality = row.querySelector('td:nth-child(1)')?.innerText.trim() || 'Unknown';
        const size = row.querySelector('td:nth-child(2)')?.innerText.trim() || 'Unknown';
        const lang = row.querySelector('td:nth-child(3)')?.innerText.trim() || '';
        const url = row.getAttribute('data-href');
        return { index: i + 1, quality, size, lang, url };
      })
    );

    await browser.close();
    return qualities;
  } catch (e) {
    console.error('Error fetching qualities via Puppeteer:', e);
    return [];
  }
}

async function scrapeModifiedLink(url) {
  try {
    const resp = await axios.get(url, { headers: headers1, maxRedirects: 5 });
    const $ = cheerio.load(resp.data);
    let link = $('#link').attr('href');
    if (!link) return url;

    const mapping = [
      { search: ['https://google.com/server11/1:/','https://google.com/server12/1:/','https://google.com/server13/1:/'], replace: 'https://drive2.cscloud12.online/server1/' },
      { search: ['https://google.com/server21/1:/','https://google.com/server22/1:/','https://google.com/server23/1:/'], replace: 'https://drive2.cscloud12.online/server2/' },
      { search: ['https://google.com/server3/1:/'], replace: 'https://drive2.cscloud12.online/server3/' },
      { search: ['https://google.com/server4/1:/'], replace: 'https://drive2.cscloud12.online/server4/' }
    ];

    mapping.forEach(m =>
      m.search.forEach(s =>
        { if (link.includes(s)) link = link.replace(s, m.replace); }
      )
    );

    link = link
      .replace('.mp4?bot=cscloud2bot&code=', '?ext=mp4&bot=cscloud2bot&code=')
      .replace('.mp4', '?ext=mp4')
      .replace('.mkv?bot=cscloud2bot&code=', '?ext=mkv&bot=cscloud2bot&code=')
      .replace('.mkv', '?ext=mkv')
      .replace('.zip', '?ext=zip');

    return link;
  } catch (e) {
    console.error('Error in scrapeModifiedLink:', e);
    return url;
  }
}

async function fetchJsonData(data, url) {
  try {
    const resp = await axios.post(url, data, { headers: { 'Content-Type': 'application/json' }, maxRedirects: 5 });
    const htmlResp = await axios.get(url);
    const $ = cheerio.load(htmlResp.data);
    const fileSize = $('p.file-info:contains("File Size") span').text().trim() || 'Unknown';
    resp.data.fileSize = fileSize;
    return resp.data;
  } catch (e) {
    console.error('Error in fetchJsonData:', e);
    return { error: e.message };
  }
}

cmd({
  pattern: 'film',
  alias: ['movie','cinesub'],
  use: '.film <query>',
  desc: 'Search and download movies',
  category: 'download',
  filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
  if (!q) return reply('🔎 Please provide a film name.');

  await m.react('🎬');
  const films = await getMovieDetailsAndDownloadLinks(q);
  if (!films.length) return reply('❌ No movies found.');

  const listLines = films.map((f, idx) => `${toEmojiNumber(idx+1)} *${f.filmName}*\n`).join('');
  const listMsg = `╔═━━━━ MOVIE LIST ━━━━╗\n${listLines}Choose by number (emoji reply).`;
  const sent = await conn.sendMessage(from, {
    image: { url: 'https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true' },
    caption: listMsg,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: channelJid,
        newsletterName: channelName,
        serverMessageId: -1
      }
    }
  }, { quoted: m });

  sessionStates.set(from, { step: 'choose_movie', films, messageId: sent.key.id });
});

conn.ev.on('messages.upsert', async msgUp => {
  const msg = msgUp.messages[0];
  if (!msg.message?.extendedTextMessage) return;

  const from = msg.key.remoteJid;
  const session = sessionStates.get(from);
  if (!session) return;

  const serial = msg.message.extendedTextMessage.text.trim();
  const choice = parseInt(serial) - 1;

  // Movie selection
  if (session.step === 'choose_movie' && choice >= 0 && choice < session.films.length && msg.message.extendedTextMessage.contextInfo?.stanzaId === session.messageId) {
    await conn.sendMessage(from, { react: { text: '❤️', key: msg.key } });
    const film = session.films[choice];
    session.film = film;

    const qualities = await fetchQualityOptions(film.movieLink);
    if (!qualities.length) {
      await conn.sendMessage(from, { text: '❌ No quality options found.' }, { quoted: msg });
      sessionStates.delete(from);
      return;
    }

    let qList = `─ Select Quality for *${film.filmName}* ─\n`;
    qualities.forEach(q => {
      qList += `${toEmojiNumber(q.index)} *${q.quality}* — ${q.size}\n`;
    });

    const sentQ = await conn.sendMessage(from, {
      image: { url: film.imageUrl || 'https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true' },
      caption: qList,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelJid,
          newsletterName: channelName,
          serverMessageId: -1
        }
      }
    }, { quoted: msg });

    session.step = 'choose_quality';
    session.qualities = qualities;
    session.messageId = sentQ.key.id;
    sessionStates.set(from, session);
  }

  // Quality selection
  else if (session.step === 'choose_quality' && msg.message.extendedTextMessage.contextInfo?.stanzaId === session.messageId) {
    const qualities = session.qualities;
    const idx = parseInt(serial) - 1;
    if (idx < 0 || idx >= qualities.length) {
      await conn.sendMessage(from, { react: { text: '❌', key: msg.key } });
      await conn.sendMessage(from, { text: '❌ Invalid choice.' }, { quoted: msg });
      return;
    }

    await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } });
    const chosen = qualities[idx];

    const modified = await scrapeModifiedLink(chosen.url);
    const info = await fetchJsonData({ direct: true }, modified);
    if (!info.url) {
      await conn.sendMessage(from, { text: '❌ Cannot fetch download URL.' }, { quoted: msg });
      sessionStates.delete(from);
      return;
    }

    const ext = info.url.split('.').pop().split('?')[0];
    const mimetype = ext === 'mkv' ? 'video/x-matroska' : ext === 'zip' ? 'application/zip' : 'video/mp4';

    await conn.sendMessage(from, {
      text: 'Preparing your download... ⌛'
    }, { quoted: msg });

    if (['𝙷𝙴𝚁𝙾𝙺𝚄','𝙺𝙾𝚈𝙴𝙱'].includes((os.hostname().length === 36 && "𝙷𝙴𝚁𝙾𝙺𝚄") || (os.hostname().length === 8 && "𝙺𝙾𝚈𝙴𝙱"))) {
      await conn.sendMessage(from, { text: `Platform restricts large files—use another server.` }, { quoted: msg });
      sessionStates.delete(from);
      return;
    }

    await conn.sendMessage(from, {
      document: { url: info.url },
      mimetype,
      fileName: `${session.film.filmName}.${ext}`,
      caption: `✅ Download Complete: *${session.film.filmName}*\nSize: ${info.fileSize}`
    }, { quoted: msg });

    sessionStates.delete(from);
  }
});
