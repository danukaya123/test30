const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};

// Function to get download links from a movie page
async function getDownloadLinks(movieUrl) {
  try {
    const response = await axios.get(movieUrl, { headers });
    const $ = cheerio.load(response.data);

    const downloadLinks = [];
    $('tr.clidckable-rowdd').each((i, el) => {
      const link = $(el).attr('data-href');
      const quality = $(el).find('td').eq(0).text().trim();
      const size = $(el).find('td').eq(1).text().trim();
      if (link && quality && size) {
        downloadLinks.push({ link, quality, size });
      }
    });

    return downloadLinks;
  } catch (err) {
    console.error('Error fetching download links:', err.message);
    return [];
  }
}

cmd({
  pattern: 'film',
  desc: 'Search movies on Cinesubz',
  category: 'download',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('🔎 Please provide a movie name to search.');

  await reply('🔍 Searching for movies...');

  const movies = await searchMovies(q); // same function from Step 1

  if (movies.length === 0) return reply('❌ No movies found.');

  let movieListMessage = '🎬 *Movies Found:*\n\n';
  const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];

  movies.forEach((movie, i) => {
    const emojiIndex = (i + 1).toString().split('').map(n => numberEmojis[n]).join('');
    movieListMessage += `${emojiIndex} *${movie.title}* (${movie.year})\n`;
  });

  const sentMessage = await conn.sendMessage(from, {
    image: { url: movies[0].image || 'https://i.ibb.co/2yq3fXJ/no-image.png' },
    caption: movieListMessage
  }, { quoted: m });

  // Listen for the user's reply
  conn.ev.on('messages.upsert', async (msgUpdate) => {
    const msg = msgUpdate.messages[0];
    if (!msg.message || !msg.message.extendedTextMessage) return;

    // Check if reply is to the movie list message
    if (msg.message.extendedTextMessage.contextInfo &&
        msg.message.extendedTextMessage.contextInfo.stanzaId === sentMessage.key.id) {

      const selectedIndex = parseInt(msg.message.extendedTextMessage.text.trim()) - 1;
      if (selectedIndex < 0 || selectedIndex >= movies.length) {
        return conn.sendMessage(from, { text: '❌ Invalid selection. Please select a valid number.' }, { quoted: msg });
      }

      const selectedMovie = movies[selectedIndex];
      await conn.sendMessage(from, { text: `🎬 Fetching download links for *${selectedMovie.title}*...` });

      const downloadLinks = await getDownloadLinks(selectedMovie.link);

      if (downloadLinks.length === 0) {
        return conn.sendMessage(from, { text: '⚠️ No download links found for this movie.' }, { quoted: msg });
      }

      // Build quality list message
      let qualityMessage = `📥 *Available Download Qualities for ${selectedMovie.title}:*\n\n`;
      downloadLinks.forEach((dl, i) => {
        const emojiIndex = (i + 1).toString().split('').map(n => numberEmojis[n]).join('');
        qualityMessage += `${emojiIndex} *${dl.quality}* - ${dl.size}\n`;
      });

      await conn.sendMessage(from, { text: qualityMessage }, { quoted: msg });
    }
  });
});
