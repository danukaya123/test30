const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://google.com',
};

const pendingFilmReplies = new Map();

async function fetchMovieResults(query) {
  try {
    const res = await axios.get(`https://cinesubz.lk/?s=${encodeURIComponent(query)}`, { headers });
    const $ = cheerio.load(res.data);
    const films = [];

    $('article').each((i, el) => {
      const filmName = $(el).find('.details .title a').text().trim();
      const imageUrl = $(el).find('.image .thumbnail img').attr('src');
      const movieLink = $(el).find('.image .thumbnail a').attr('href');
      const description = $(el).find('.details .contenido p').text().trim();
      const year = $(el).find('.details .meta .year').text().trim();
      const imdbText = $(el).find('.details .meta .rating:first').text().trim();
      const imdb = imdbText.replace('IMDb', '').trim();
      if (filmName && imageUrl && movieLink) {
        films.push({ filmName, imageUrl, movieLink, description, year, imdb });
      }
    });

    return films;
  } catch (err) {
    console.error('Fetch movie error:', err.message);
    return [];
  }
}

cmd({
  pattern: "film",
  alias: ["movie", "cinesub"],
  use: ".film <query>",
  desc: "Search and get movie details",
  category: "download",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
  if (!q) return reply("🔍 Please provide a film name.");

  const films = await fetchMovieResults(q);
  if (films.length === 0) return reply("❌ No movies found.");

  for (const film of films.slice(0, 3)) {
    const caption = `🎬 *${film.filmName}*
📅 Year: *${film.year}*
⭐ IMDb: *${film.imdb}*
📝 Description: ${film.description}\n\n🔗 [Watch/Download](${film.movieLink})`;

    await conn.sendMessage(from, {
      image: { url: film.imageUrl },
      caption,
    }, { quoted: mek });
  }
});
