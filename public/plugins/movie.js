// movie-vercel.js - Complete Vercel Streaming Plugin
const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

// ========== CONFIGURATION ==========
// ⚠️ SET YOUR VERCEL URL HERE ⚠️
const VERCEL_URL = 'https://test5689.vercel.app'; // Replace with your Vercel URL

// Cache for search results (5 minutes)
const searchCache = new Map();
const metadataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ========== VERCEL STREAMING FUNCTIONS ==========
function getStreamUrl(pixeldrainUrl, filename, method = 'stream') {
  const encodedUrl = encodeURIComponent(pixeldrainUrl);
  const encodedName = encodeURIComponent(filename);
  return `${VERCEL_URL}/api/${method}?url=${encodedUrl}&filename=${encodedName}`;
}

// ========== MOVIE SEARCH FUNCTIONS ==========
async function searchMovies(query, useCache = true) {
  const cacheKey = `search:${query.toLowerCase()}`;
  
  if (useCache && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📂 Using cached search results for: ${query}`);
      return cached.results;
    }
  }
  
  console.log(`🔍 Searching movies: ${query}`);
  
  try {
    const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
    
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    const results = [];
    
    $('.display-item .item-box').each((index, element) => {
      const $el = $(element);
      const title = $el.find('a[title]').attr('title')?.trim();
      const url = $el.find('a[href]').attr('href');
      const image = $el.find('.thumb').attr('src');
      const language = $el.find('.language').text().trim() || 'Sinhala';
      const quality = $el.find('.quality').text().trim() || 'HD';
      
      if (title && url) {
        results.push({
          id: index + 1,
          title,
          url,
          image,
          language,
          quality,
          year: title.match(/(\d{4})/)?.[1] || 'Unknown'
        });
      }
    });
    
    // Cache results
    if (useCache && results.length > 0) {
      searchCache.set(cacheKey, {
        results: results.slice(0, 8), // Cache only first 8 results
        timestamp: Date.now()
      });
    }
    
    console.log(`✅ Found ${results.length} movies`);
    return results.slice(0, 8); // Return max 8 results
    
  } catch (error) {
    console.error(`❌ Search error: ${error.message}`);
    return [];
  }
}

async function getMovieMetadata(movieUrl, useCache = true) {
  const cacheKey = `meta:${movieUrl}`;
  
  if (useCache && metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.metadata;
    }
  }
  
  console.log(`📥 Fetching metadata: ${movieUrl}`);
  
  try {
    const { data } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    
    // Extract metadata
    const metadata = {
      title: $('.details-title h3').text().trim() || 'Unknown',
      description: $('.splash-desc p').text().trim() || '',
      thumbnail: $('.splash-bg img').attr('src') || '',
      duration: $('[itemprop="duration"]').text().trim() || '',
      imdb: $('.data-imdb').text().replace('IMDb:', '').trim() || 'N/A',
      genres: [],
      directors: [],
      stars: [],
      downloadLinks: []
    };
    
    // Extract genres
    $('.details-genre a').each((i, el) => {
      metadata.genres.push($(el).text().trim());
    });
    
    // Extract download links (pixeldrain)
    $('a[href*="pixeldrain"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && href.includes('pixeldrain.com/u/')) {
        const match = href.match(/pixeldrain\.com\/u\/(\w+)/);
        if (match) {
          const quality = text.includes('1080') ? '1080p' : 
                         text.includes('720') ? '720p' : 
                         text.includes('480') ? '480p' : 'SD';
          
          const directUrl = `https://pixeldrain.com/api/file/${match[1]}?download`;
          
          metadata.downloadLinks.push({
            quality,
            url: directUrl,
            source: 'pixeldrain',
            label: text || quality
          });
        }
      }
    });
    
    // If no pixeldrain links found, look for other download links
    if (metadata.downloadLinks.length === 0) {
      $('a[href*="download"], a[href*=".mp4"], a[href*=".mkv"]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        
        if (href && (href.includes('http') || href.includes('//'))) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, movieUrl).href;
          
          metadata.downloadLinks.push({
            quality: 'Unknown',
            url: fullUrl,
            source: 'direct',
            label: text || 'Download'
          });
        }
      });
    }
    
    // Cache metadata
    if (useCache) {
      metadataCache.set(cacheKey, {
        metadata,
        timestamp: Date.now()
      });
    }
    
    console.log(`✅ Metadata loaded with ${metadata.downloadLinks.length} links`);
    return metadata;
    
  } catch (error) {
    console.error(`❌ Metadata error: ${error.message}`);
    return {
      title: 'Unknown',
      description: '',
      thumbnail: '',
      downloadLinks: []
    };
  }
}

// ========== USER SESSION MANAGEMENT ==========
const userSessions = new Map();

function setUserSession(userId, data) {
  userSessions.set(userId, {
    ...data,
    timestamp: Date.now()
  });
}

function getUserSession(userId) {
  const session = userSessions.get(userId);
  if (session && Date.now() - session.timestamp < 10 * 60 * 1000) { // 10 minutes
    return session;
  }
  userSessions.delete(userId);
  return null;
}

// ========== COMMANDS ==========

/* ================= MOVIE SEARCH COMMAND ================= */
cmd({
  pattern: "movie",
  alias: ["film", "sinhalasub", "cinema", "movies"],
  react: "🎬",
  desc: "Search and stream movies via Vercel (Zero bot memory)",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  
  if (!q) {
    return reply(`*🎬 VERCEL MOVIE STREAMING*\n\n*Usage:* .movie <movie_name>\n*Example:* .movie avatar\n\n*Features:*\n• Zero bot memory usage\n• Vercel serverless streaming\n• Fast global CDN\n• WhatsApp optimized\n\n*Powered by DANUWA-MD*`);
  }
  
  console.log(`👤 ${sender} searching: ${q}`);
  
  await reply(`*🔍 Searching movies for "${q}"...*`);
  
  const movies = await searchMovies(q);
  
  if (!movies.length) {
    return reply(`*❌ No movies found for "${q}"*\n\nTry a different search term or check spelling.`);
  }
  
  // Store in session
  setUserSession(sender, {
    type: 'search',
    query: q,
    movies,
    step: 'select_movie'
  });
  
  // Create selection message
  let message = `*🎬 Found ${movies.length} Movies*\n\n`;
  
  movies.forEach((movie, index) => {
    message += `${index + 1}. *${movie.title}*\n`;
    message += `   🎭 ${movie.language} | 📁 ${movie.quality} | 📅 ${movie.year}\n\n`;
  });
  
  message += `*Reply with number (1-${movies.length}) to select movie*\n`;
  message += `*Files will stream via Vercel (No bot memory used)*`;
  
  await danuwa.sendMessage(from, { text: message }, { quoted: mek });
});

/* ================= MOVIE SELECTION HANDLER ================= */
cmd({
  filter: (text, { sender }) => {
    const session = getUserSession(sender);
    return session && 
           session.type === 'search' && 
           session.step === 'select_movie' &&
           !isNaN(text) && 
           parseInt(text) > 0 && 
           parseInt(text) <= session.movies.length;
  }
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  
  const session = getUserSession(sender);
  const movieIndex = parseInt(body) - 1;
  const selectedMovie = session.movies[movieIndex];
  
  console.log(`👤 ${sender} selected: ${selectedMovie.title}`);
  
  await reply(`*📥 Loading "${selectedMovie.title}"...*`);
  
  // Get movie metadata and download links
  const metadata = await getMovieMetadata(selectedMovie.url);
  
  if (!metadata.downloadLinks.length) {
    return reply(`*❌ No download links found for this movie*\n\nTry another movie or check the website.`);
  }
  
  // Update session
  setUserSession(sender, {
    type: 'quality_select',
    movie: selectedMovie,
    metadata,
    downloadLinks: metadata.downloadLinks,
    step: 'select_quality'
  });
  
  // Create quality selection message
  let message = `*🎬 ${metadata.title}*\n`;
  
  if (metadata.imdb && metadata.imdb !== 'N/A') {
    message += `⭐ IMDb: ${metadata.imdb}\n`;
  }
  
  if (metadata.duration) {
    message += `⏱️ Duration: ${metadata.duration}\n`;
  }
  
  if (metadata.genres.length) {
    message += `🎭 Genres: ${metadata.genres.join(', ')}\n`;
  }
  
  message += `\n*📥 Available Download Links:*\n\n`;
  
  metadata.downloadLinks.forEach((link, index) => {
    message += `${index + 1}. *${link.quality}*\n`;
    if (link.source === 'pixeldrain') {
      message += `   🔗 ${link.label}\n`;
    }
    message += `\n`;
  });
  
  message += `*Reply with number (1-${metadata.downloadLinks.length}) to stream via Vercel*\n`;
  message += `*Zero bot memory usage - Vercel handles everything*`;
  
  await reply(message);
});

/* ================= STREAM VIA VERCEL ================= */
cmd({
  filter: (text, { sender }) => {
    const session = getUserSession(sender);
    return session && 
           session.type === 'quality_select' && 
           session.step === 'select_quality' &&
           !isNaN(text) && 
           parseInt(text) > 0 && 
           parseInt(text) <= session.downloadLinks.length;
  }
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  
  const session = getUserSession(sender);
  const linkIndex = parseInt(body) - 1;
  const selectedLink = session.downloadLinks[linkIndex];
  
  console.log(`🚀 Streaming: ${session.movie.title} - ${selectedLink.quality}`);
  
  // Create safe filename
  const safeFilename = `${session.metadata.title.substring(0, 50)} - ${selectedLink.quality}.mp4`
    .replace(/[^\w\s.-]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Generate Vercel streaming URL
  const vercelStreamUrl = getStreamUrl(selectedLink.url, safeFilename);
  
  console.log(`🌐 Vercel URL: ${vercelStreamUrl}`);
  
  // Send progress message
  const progressMsg = await reply(`*🚀 Starting Vercel Streaming...*\n\n` +
    `*Movie:* ${session.metadata.title}\n` +
    `*Quality:* ${selectedLink.quality}\n` +
    `*Method:* Vercel Serverless Proxy\n` +
    `*Status:* Initializing stream...\n\n` +
    `⚠️ *Please wait 10-30 seconds*\n` +
    `Vercel is fetching and streaming the movie...`);
  
  try {
    // Send to WhatsApp via Vercel
    const result = await danuwa.sendMessage(from, {
      document: {
        url: vercelStreamUrl
      },
      mimetype: "video/mp4",
      fileName: safeFilename,
      caption: `🎬 *${session.metadata.title}*\n` +
               `📊 ${selectedLink.quality}\n` +
               `🚀 Streamed via Vercel\n` +
               `⚡ Zero bot memory usage\n` +
               `🌍 Global CDN delivery\n\n` +
               `Powered by *DANUWA-MD*`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363418166326365@newsletter',
          newsletterName: '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁',
          serverMessageId: -1
        }
      }
    }, { quoted: mek });
    
    console.log(`✅ Movie sent successfully via Vercel`);
    
    // Delete progress message
    if (progressMsg) {
      await danuwa.sendMessage(from, {
        delete: progressMsg.key
      });
    }
    
    // Clear session
    userSessions.delete(sender);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Streaming error:`, error);
    
    // Update progress message with error
    await danuwa.sendMessage(from, {
      text: `*❌ Vercel Streaming Failed*\n\n` +
            `*Error:* ${error.message}\n\n` +
            `*Fallback Options:*\n` +
            `1. Try a different quality\n` +
            `2. Use direct download link:\n${selectedLink.url}\n` +
            `3. Try again in a few minutes\n\n` +
            `*Copy the link above and paste in browser to download.*`,
      edit: progressMsg?.key
    });
    
    // Clear session on error
    userSessions.delete(sender);
  }
});

/* ================= DIRECT DOWNLOAD COMMAND ================= */
cmd({
  pattern: "dls",
  alias: ["stream", "vercel"],
  react: "⚡",
  desc: "Direct stream any file via Vercel",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  
  if (!q) {
    return reply(`*⚡ DIRECT VERCEL STREAM*\n\n*Usage:* .dls <url> [filename]\n*Example:* .dls https://example.com/file.mp4 movie.mp4\n\n*Max file size:* 2GB\n*Streaming via Vercel CDN*`);
  }
  
  const args = q.split(' ');
  let url, filename;
  
  if (args.length >= 2) {
    url = args[0];
    filename = args.slice(1).join(' ');
  } else {
    url = q;
    filename = url.split('/').pop() || 'download.mp4';
  }
  
  // Validate URL
  if (!url.startsWith('http')) {
    return reply(`*❌ Invalid URL*\n\nPlease provide a valid http/https URL.`);
  }
  
  console.log(`⚡ Direct stream: ${filename}`);
  
  const vercelStreamUrl = getStreamUrl(url, filename);
  
  await reply(`*⚡ Streaming via Vercel...*\n\n` +
              `*File:* ${filename}\n` +
              `*URL:* ${url.substring(0, 50)}...\n` +
              `*Status:* Initializing...`);
  
  try {
    await danuwa.sendMessage(from, {
      document: {
        url: vercelStreamUrl
      },
      mimetype: "application/octet-stream",
      fileName: filename,
      caption: `📥 *${filename}*\n` +
               `⚡ Streamed via Vercel\n` +
               `🌍 Zero bot memory usage\n` +
               `🚀 Fast CDN delivery`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true
      }
    }, { quoted: mek });
    
    console.log(`✅ Direct stream successful`);
    
  } catch (error) {
    console.error(`❌ Direct stream error:`, error);
    await reply(`*❌ Streaming failed*\n\n*Error:* ${error.message}\n\n*Direct URL:* ${url}`);
  }
});

/* ================= VERCEL STATUS COMMAND ================= */
cmd({
  pattern: "vstatus",
  alias: ["vercelstatus", "vping"],
  react: "🌍",
  desc: "Check Vercel streaming status",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, reply }) => {
  
  try {
    const pingUrl = `${VERCEL_URL}/api/ping`;
    const response = await axios.get(pingUrl, { timeout: 5000 });
    
    await reply(`*🌍 VERCEL STREAMING STATUS*\n\n` +
                `✅ Status: ONLINE\n` +
                `🔗 URL: ${VERCEL_URL}\n` +
                `📊 Version: ${response.data.version || '1.0.0'}\n` +
                `🕒 Uptime: ${response.data.timestamp || 'Active'}\n\n` +
                `*Endpoints:*\n` +
                `• /api/stream - Main streaming\n` +
                `• /api/proxy - Fast proxy\n` +
                `• /api/ping - Health check\n\n` +
                `*Ready for movie streaming!* 🎬`);
    
  } catch (error) {
    await reply(`*🌍 VERCEL STREAMING STATUS*\n\n` +
                `❌ Status: OFFLINE\n` +
                `🔗 URL: ${VERCEL_URL}\n` +
                `⚠️ Error: ${error.message}\n\n` +
                `*Please check:*\n` +
                `1. Vercel deployment status\n` +
                `2. Internet connection\n` +
                `3. VERCEL_URL in plugin config`);
  }
});

/* ================= CLEAR CACHE COMMAND ================= */
cmd({
  pattern: "clearmovie",
  alias: ["movieclear"],
  react: "🧹",
  desc: "Clear movie cache and sessions",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, sender, reply }) => {
  
  // Clear caches
  searchCache.clear();
  metadataCache.clear();
  userSessions.delete(sender);
  
  await reply(`*🧹 Cache Cleared*\n\n` +
              `✅ Search cache cleared\n` +
              `✅ Metadata cache cleared\n` +
              `✅ Your session cleared\n\n` +
              `All caches have been reset.`);
});

// ========== CLEANUP ROUTINE ==========
setInterval(() => {
  const now = Date.now();
  const sessionTTL = 30 * 60 * 1000; // 30 minutes
  
  // Cleanup user sessions
  for (const [userId, session] of userSessions) {
    if (now - session.timestamp > sessionTTL) {
      userSessions.delete(userId);
      console.log(`🧹 Cleaned expired session: ${userId}`);
    }
  }
  
  // Cleanup search cache
  for (const [key, data] of searchCache) {
    if (now - data.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
  
  // Cleanup metadata cache
  for (const [key, data] of metadataCache) {
    if (now - data.timestamp > CACHE_TTL) {
      metadataCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// ========== MODULE EXPORTS ==========
module.exports = {
  userSessions,
  searchCache,
  metadataCache,
  VERCEL_URL,
  getStreamUrl
};
