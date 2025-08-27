const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};

async function searchMovies(query) {
  try {
    const url = `https://cinesubz.lk/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const movies = [];

    $('article').each((i, el) => {
      const title = $(el).find('.details .title a').text().trim();
      const link = $(el).find('.image .thumbnail a').attr('href');
      const image = $(el).find('.image .thumbnail img').attr('src');
      const year = $(el).find('.details .meta .year').text().trim();

      if (title && link) {
        movies.push({ title, link, image, year });
      }
    });

    return movies;
  } catch (err) {
    console.error('Error searching movies:', err.message);
    return [];
  }
}

cmd({
  pattern: 'cinesearch',
  desc: 'Search movies on Cinesubz',
  category: 'download',
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply('🔎 Please provide a movie name to search.');

  await reply('🔍 Searching for movies...');

  const movies = await searchMovies(q);

  if (movies.length === 0) return reply('❌ No movies found.');

  // Build the movie list message
  let movieListMessage = '🎬 *Movies Found:*\n\n';
  const numberEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

  movies.forEach((movie, i) => {
    const emojiIndex = (i + 1).toString().split('').map(n => numberEmojis[n]).join('');
    movieListMessage += `${emojiIndex} *${movie.title}* (${movie.year})\n`;
  });

  await conn.sendMessage(from, {
    image: { url: movies[0].image || 'https://i.ibb.co/2yq3fXJ/no-image.png' },
    caption: movieListMessage
  }, { quoted: m });
});
