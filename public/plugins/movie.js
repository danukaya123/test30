const { cmd } = require("../command");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");
const cheerio = require("cheerio");
const config = require("../config");
const http = require('http');
const https = require('https');

// ========== TRUE STREAMING MEMORY MONITOR ==========
class StreamingMemoryMonitor {
    constructor(updateInterval = 200) {
        this.updateInterval = updateInterval;
        this.interval = null;
        this.isMonitoring = false;
        this.startTime = null;
        this.lineCount = 8;
        this.displayLines = [];
        this.maxRSS = 0;
        this.maxExternal = 0;
    }

    formatMemory(bytes) {
        const mb = bytes / 1024 / 1024;
        return mb.toFixed(2);
    }

    getMemoryStats() {
        const mem = process.memoryUsage();
        const elapsed = Date.now() - this.startTime;
        
        // Track maximums
        this.maxRSS = Math.max(this.maxRSS, mem.rss);
        this.maxExternal = Math.max(this.maxExternal, mem.external);
        
        return {
            elapsed: elapsed < 1000 ? `${elapsed} ms` : `${(elapsed/1000).toFixed(1)} s`,
            rss: this.formatMemory(mem.rss),
            heapUsed: this.formatMemory(mem.heapUsed),
            heapTotal: this.formatMemory(mem.heapTotal),
            external: this.formatMemory(mem.external),
            maxRSS: this.formatMemory(this.maxRSS),
            maxExternal: this.formatMemory(this.maxExternal)
        };
    }

    createDisplay(stats) {
        return [
            `╔══════════════════════════════════════════════════╗`,
            `║      🎬 TRUE STREAMING MEMORY MONITOR           ║`,
            `╠══════════════════════════════════════════════════╣`,
            `║  ⏱️  Uptime: ${stats.elapsed.padEnd(12)}                ║`,
            `║  📊 RSS: ${stats.rss.padEnd(8)} MB (Max: ${stats.maxRSS.padEnd(6)} MB)║`,
            `║  💾 Heap Used: ${stats.heapUsed.padEnd(8)} MB              ║`,
            `║  🔥 Heap Total: ${stats.heapTotal.padEnd(8)} MB             ║`,
            `║  🌐 External: ${stats.external.padEnd(8)} MB (Max: ${stats.maxExternal.padEnd(6)} MB)║`,
            `╚══════════════════════════════════════════════════╝`
        ];
    }

    updateDisplay() {
        const stats = this.getMemoryStats();
        const newLines = this.createDisplay(stats);
        
        if (!this.displayLines.length) {
            this.displayLines = newLines;
            newLines.forEach(line => console.log(`\x1b[36m${line}\x1b[0m`));
            return;
        }
        
        process.stdout.write('\x1B[' + this.lineCount + 'A');
        
        newLines.forEach((line, i) => {
            process.stdout.write('\x1B[2K');
            console.log(`\x1b[36m${line}\x1b[0m`);
        });
        
        this.displayLines = newLines;
        
        // Show alerts if memory is high
        this.showAlerts(stats);
    }

    showAlerts(stats) {
        const rssMB = parseFloat(stats.rss);
        const externalMB = parseFloat(stats.external);
        
        if (rssMB > 500) {
            console.log(`\x1b[33m⚠️  RSS High: ${stats.rss} MB - True streaming should keep this low!\x1b[0m`);
        }
        
        if (externalMB > 300) {
            console.log(`\x1b[33m⚠️  External High: ${stats.external} MB - Check for buffering!\x1b[0m`);
        }
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        this.maxRSS = 0;
        this.maxExternal = 0;
        this.displayLines = [];
        
        console.log('\n');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        console.log('\x1b[42m\x1b[30m          🎬 TRUE STREAMING MODE ACTIVATED (NO BUFFERING)     \x1b[0m');
        console.log('\x1b[42m\x1b[30m══════════════════════════════════════════════════════════════\x1b[0m');
        
        this.updateDisplay();
        
        this.interval = setInterval(() => {
            this.updateDisplay();
        }, this.updateInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        if (this.isMonitoring) {
            process.stdout.write('\x1B[' + (this.lineCount + 1) + 'A');
            for (let i = 0; i < this.lineCount + 2; i++) {
                process.stdout.write('\x1B[2K\x1B[1B');
            }
            
            const mem = process.memoryUsage();
            console.log('\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m');
            console.log(`\x1b[32m✅ Streaming completed! Max RSS: ${this.formatMemory(this.maxRSS)} MB\x1b[0m`);
            console.log(`\x1b[32m📊 Current RSS: ${this.formatMemory(mem.rss)} MB\x1b[0m`);
            console.log(`\x1b[32m💾 Heap Used: ${this.formatMemory(mem.heapUsed)} MB\x1b[0m`);
            console.log(`\x1b[32m🌐 External: ${this.formatMemory(mem.external)} MB\x1b[0m`);
            console.log('\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m\n');
        }
        
        this.isMonitoring = false;
    }
}

const memoryMonitor = new StreamingMemoryMonitor();
// ========== END MEMORY MONITOR ==========

const pendingSearch = {};
const pendingQuality = {};
const channelJid = '120363418166326365@newsletter'; 
const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';
const imageUrl = "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/film.png?raw=true";

// Create custom HTTP agents that don't keep connections alive
const httpAgent = new http.Agent({ 
    keepAlive: false,
    maxSockets: 1  // Limit concurrent connections
});

const httpsAgent = new https.Agent({ 
    keepAlive: false,
    maxSockets: 1,
    rejectUnauthorized: false  // For some SSL issues
});

// ---------- Helper Functions ----------
function normalizeQuality(text) {
    if (!text) return null;
    text = text.toUpperCase();
    if (/1080|FHD/.test(text)) return "1080p";
    if (/720|HD/.test(text)) return "720p";
    if (/480|SD/.test(text)) return "480p";
    return text;
}

function getDirectPixeldrainUrl(url) {
    const match = url.match(/pixeldrain\.com\/u\/(\w+)/);
    if (!match) return null;
    return `https://pixeldrain.com/api/file/${match[1]}?download`;
}

async function getFileInfo(url) {
    try {
        const response = await axios.head(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
            timeout: 5000
        });
        
        const contentLength = response.headers['content-length'];
        const contentType = response.headers['content-type'] || 'video/mp4';
        
        if (contentLength) {
            const bytes = parseInt(contentLength);
            let size;
            if (bytes > 1024 * 1024 * 1024) {
                size = (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
            } else {
                size = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            }
            return { size, contentType, bytes };
        }
    } catch (error) {
        console.log(`\x1b[33m⚠️ Could not get file info: ${error.message}\x1b[0m`);
    }
    return null;
}

// ---------- TRUE STREAMING FUNCTION ----------
async function trueStreamToWhatsApp(danuwa, from, fileUrl, fileName, caption, quoted) {
    return new Promise(async (resolve, reject) => {
        console.log(`\x1b[36m🚀 Starting TRUE streaming: ${fileName}\x1b[0m`);
        console.log(`\x1b[36m🔗 Source: ${fileUrl}\x1b[0m`);
        
        try {
            // Get file info first
            const fileInfo = await getFileInfo(fileUrl);
            const fileSize = fileInfo ? fileInfo.size : 'Unknown';
            const mimeType = fileInfo ? fileInfo.contentType : 'video/mp4';
            
            console.log(`\x1b[36m📦 File Size: ${fileSize}\x1b[0m`);
            console.log(`\x1b[36m🎯 MIME Type: ${mimeType}\x1b[0m`);
            console.log(`\x1b[36m💡 TRUE STREAMING: No buffering in bot memory\x1b[0m`);
            
            // Send message with direct URL - WhatsApp will handle the download
            const messageSent = await danuwa.sendMessage(from, {
                document: { 
                    url: fileUrl  // Direct URL only - NO BUFFERING
                },
                mimetype: mimeType,
                fileName: fileName,
                caption: caption + `\n\n📦 Size: ${fileSize}\n🚀 Method: True Streaming (Zero bot memory)`,
                contextInfo: {       
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelJid,
                        newsletterName: channelName,
                        serverMessageId: -1
                    }
                }
            }, { quoted: quoted });
            
            console.log(`\x1b[32m✅ File sent via TRUE streaming!\x1b[0m`);
            console.log(`\x1b[32m🔗 WhatsApp is downloading directly from source\x1b[0m`);
            
            // Force memory cleanup
            setTimeout(() => {
                httpAgent.destroy();
                httpsAgent.destroy();
                if (global.gc) {
                    global.gc();
                    console.log(`\x1b[32m🧹 Garbage collection forced\x1b[0m`);
                }
            }, 1000);
            
            resolve(messageSent);
            
        } catch (error) {
            console.error(`\x1b[31m❌ TRUE Streaming error: ${error.message}\x1b[0m`);
            
            // Alternative: Send as text with download link
            console.log(`\x1b[33m🔄 Falling back to direct link method\x1b[0m`);
            
            const fallbackMessage = `${caption}\n\n*📦 Direct Download Link:*\n\`\`\`${fileUrl}\`\`\`\n\n*📝 Instructions:*\n1. Copy the link\n2. Use download manager\n3. WhatsApp may download directly`;
            
            try {
                const fallbackResult = await danuwa.sendMessage(from, {
                    text: fallbackMessage,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: channelJid,
                            newsletterName: channelName,
                            serverMessageId: -1
                        }
                    }
                }, { quoted: quoted });
                
                console.log(`\x1b[32m✅ Fallback link sent successfully\x1b[0m`);
                resolve(fallbackResult);
            } catch (fallbackError) {
                reject(fallbackError);
            }
        }
    });
}

// ---------- Movie Search ----------
async function searchMovies(query) {
    console.log(`\x1b[34m🔍 Searching movies for: ${query}\x1b[0m`);
    const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
            timeout: 10000
        });
        
        const $ = cheerio.load(data);
        const results = [];
        
        $(".display-item .item-box").slice(0, 10).each((index, box) => {
            const $box = $(box);
            const a = $box.find("a");
            const img = $box.find(".thumb");
            const lang = $box.find(".item-desc-giha .language").text() || "";
            const quality = $box.find(".item-desc-giha .quality").text() || "";
            const qty = $box.find(".item-desc-giha .qty").text() || "";
            
            if (a.attr("href") && a.attr("title")) {
                results.push({
                    id: index + 1,
                    title: a.attr("title").trim(),
                    movieUrl: a.attr("href"),
                    thumb: img.attr("src") || "",
                    language: lang.trim(),
                    quality: quality.trim(),
                    qty: qty.trim()
                });
            }
        });
        
        console.log(`\x1b[32m✅ Found ${results.length} movies\x1b[0m`);
        return results;
    } catch (error) {
        console.error(`\x1b[31m❌ Search error: ${error.message}\x1b[0m`);
        return [];
    }
}

// ---------- Movie Metadata ----------
async function getMovieMetadata(url) {
    console.log(`\x1b[34m📥 Fetching metadata...\x1b[0m`);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
            timeout: 10000
        });
        
        const $ = cheerio.load(data);
        
        const title = $(".info-details .details-title h3").text().trim();
        let language = "";
        const directors = [];
        const stars = [];
        
        $(".info-col p").each((i, p) => {
            const $p = $(p);
            const strong = $p.find("strong");
            if (strong.length) {
                const txt = strong.text().trim();
                if (txt.includes("Language:")) {
                    language = $(strong[0].nextSibling).text().trim();
                }
                if (txt.includes("Director:")) {
                    $p.find("a").each((j, a) => {
                        directors.push($(a).text().trim());
                    });
                }
                if (txt.includes("Stars:")) {
                    $p.find("a").each((j, a) => {
                        stars.push($(a).text().trim());
                    });
                }
            }
        });
        
        const duration = $(".data-views[itemprop='duration']").text().trim();
        const imdb = $(".data-imdb").text().replace("IMDb:", "").trim();
        
        const genres = [];
        $(".details-genre a").each((i, a) => {
            genres.push($(a).text().trim());
        });
        
        const thumbnail = $(".splash-bg img").attr("src") || "";
        
        console.log(`\x1b[32m✅ Metadata loaded: ${title}\x1b[0m`);
        return {
            title,
            language,
            duration,
            imdb,
            genres,
            directors,
            stars,
            thumbnail
        };
    } catch (error) {
        console.error(`\x1b[31m❌ Metadata error: ${error.message}\x1b[0m`);
        return {
            title: "",
            language: "",
            duration: "",
            imdb: "",
            genres: [],
            directors: [],
            stars: [],
            thumbnail: ""
        };
    }
}

// ---------- Pixeldrain Links with TRUE Streaming ----------
async function getPixeldrainLinks(movieUrl) {
    console.log(`\x1b[34m🔗 Fetching TRUE streaming links...\x1b[0m`);
    try {
        const { data } = await axios.get(movieUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const rows = [];
        
        $(".link-pixeldrain tbody tr").each((i, tr) => {
            const $tr = $(tr);
            const a = $tr.find(".link-opt a");
            const quality = $tr.find(".quality").text().trim() || "";
            const size = $tr.find("td:nth-child(3) span").text().trim() || "";
            
            if (a.attr("href")) {
                rows.push({
                    pageLink: a.attr("href"),
                    quality,
                    size
                });
            }
        });
        
        const links = [];
        
        // Process up to 3 links for speed
        for (const l of rows.slice(0, 3)) {
            try {
                console.log(`\x1b[33m🔗 Processing: ${l.quality} - ${l.size}\x1b[0m`);
                
                const { data: pageData } = await axios.get(l.pageLink, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': movieUrl
                    },
                    httpAgent: httpAgent,
                    httpsAgent: httpsAgent,
                    timeout: 10000
                });
                
                const $$ = cheerio.load(pageData);
                const finalUrl = $$(".wait-done a[href^='https://pixeldrain.com/']").attr("href");
                
                if (finalUrl) {
                    const directUrl = getDirectPixeldrainUrl(finalUrl);
                    
                    if (!directUrl) continue;
                    
                    // Get actual file info for accurate size
                    let accurateSize = l.size;
                    let fileBytes = 0;
                    
                    const fileInfo = await getFileInfo(directUrl);
                    if (fileInfo) {
                        accurateSize = fileInfo.size;
                        fileBytes = fileInfo.bytes || 0;
                    }
                    
                    // Check if file is under 2GB (WhatsApp limit)
                    const sizeText = l.size.toUpperCase();
                    let sizeMB = 0;
                    if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
                    else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
                    
                    if (sizeMB <= 2048 && (!fileBytes || fileBytes <= 2147483648)) { // 2GB limit
                        links.push({ 
                            link: directUrl,
                            quality: normalizeQuality(l.quality), 
                            size: accurateSize,
                            originalSize: l.size
                        });
                        
                        console.log(`\x1b[32m✅ TRUE Streaming ready: ${normalizeQuality(l.quality)} - ${accurateSize}\x1b[0m`);
                    } else {
                        console.log(`\x1b[33m⚠️ Skipped: ${accurateSize} exceeds 2GB WhatsApp limit\x1b[0m`);
                    }
                }
            } catch (error) {
                console.error(`\x1b[31m❌ Link processing error: ${error.message}\x1b[0m`);
            }
        }
        
        console.log(`\x1b[32m✅ Total TRUE streaming links: ${links.length}\x1b[0m`);
        return links;
    } catch (error) {
        console.error(`\x1b[31m❌ Pixeldrain links error: ${error.message}\x1b[0m`);
        return [];
    }
}

/* ================= COMMAND: MOVIE SEARCH ================= */
cmd({
    pattern: "movie",
    alias: ["sinhalasub","films","cinema","film"],
    react: "🎬",
    desc: "Search SinhalaSub movies (TRUE Streaming - No Memory Usage)",
    category: "download",
    filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
    // Start memory monitoring
    memoryMonitor.start();
    
    if (!q) {
        setTimeout(() => memoryMonitor.stop(), 1000);
        return reply(`*🎬 TRUE STREAMING MOVIE PLUGIN*\n\nUsage: .movie movie_name\nExample: .movie avengers\n\n*🚀 Features:*\n• TRUE streaming (No bot memory)\n• Supports up to 2GB files\n• Zero buffering`);
    }

    console.log(`\x1b[36m🎬 Searching for: ${q}\x1b[0m`);
    const searchResults = await searchMovies(q);
    
    if (!searchResults.length) {
        setTimeout(() => memoryMonitor.stop(), 1000);
        return reply("*❌ No movies found!*\n\nTry another search term or check spelling.");
    }

    pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

    if (config.BUTTON) {
        const rows = searchResults.map((movie, i) => ({
            id: `${i+1}`,
            title: movie.title,
            description: `Language: ${movie.language} | Quality: ${movie.quality} | Format: ${movie.qty}`
        }));

        const interactiveButtons = [{
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: "Movie Search Results",
                sections: [{ title: "Select a movie (TRUE Streaming)", rows }]
            })
        }];

        const caption = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗧𝗥𝗨𝗘 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 𝗠𝗢𝗩𝗜𝗘𝗦 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕  
┃ 🚀 *TRUE STREAMING (Zero bot memory)*  
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃━━━━━━━━━━━━━━━━━━━━━━✦
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯

─────────────────────────`;
        
        await danuwa.sendMessage(from, { image: { url: imageUrl } }, { quoted: mek });
        await sendInteractiveMessage(danuwa, from, { text: caption, interactiveButtons, quoted: mek });

    } else {
        const numberEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
        let filmListMessage = `╔═━━━━━━━◥◣◆◢◤━━━━━━━━═╗  
║     🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁    ║          
╚═━━━━━━━◢◤◆◥◣━━━━━━━━═╝  
    📂 𝗧𝗥𝗨𝗘 𝗦𝗧𝗥𝗘𝗔𝗠𝗜𝗡𝗚 𝗠𝗢𝗩𝗜𝗘𝗦 📂  
┏━━━━━━━━━━━━━━━━━━━━━━┓  
┃ 🔰 𝗖𝗛𝗢𝗢𝗦𝗘 𝗬𝗢𝗨𝗥 MOVIE         
┃ 💬 *FOUND ${searchResults.length} MOVIES FOR "${q}"*❕    
┃ 🚀 *TRUE STREAMING (Zero bot memory)*  
┗━━━━━━━━━━━━━━━━━━━━━━┛  
┃━━━━━━━━━━━━━━━━━━━━━━✦
┃   ⚙️ M A D E  W I T H ❤️ B Y 
╰─🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥─╯

─────────────────────────`;

        searchResults.forEach((movie, index) => {
            let adjustedIndex = index + 1;
            let emojiIndex = adjustedIndex
                .toString()
                .split("")
                .map(num => numberEmojis[num])
                .join("");

            filmListMessage += `${emojiIndex} *${movie.title}*\n`;
            filmListMessage += `   📁 ${movie.quality} | 🎭 ${movie.language} | 🎞️ ${movie.qty}\n\n`;
        });

        filmListMessage += `*📝 Reply with movie number (1-${searchResults.length})*\n`;
        filmListMessage += `*🚀 TRUE Streaming: Files stream directly (No bot buffering)*\n`;
        filmListMessage += `*📦 Supports up to 2GB files*`;

        await danuwa.sendMessage(from, {
            image: { url: imageUrl },
            caption: filmListMessage,
            contextInfo: {           
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    newsletterName: channelName,
                    serverMessageId: -1
                }
            }
        }, { quoted: mek });
    }
    
    console.log('\x1b[33m⏳ Waiting for user selection...\x1b[0m');
});

/* ================= COMMAND: MOVIE SELECTION ================= */
cmd({
    filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

    await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
    
    const index = parseInt(body) - 1;
    const selected = pendingSearch[sender].results[index];
    delete pendingSearch[sender];

    console.log(`\x1b[34m🎬 Selected: ${selected.title}\x1b[0m`);
    
    reply("*🔍 Fetching movie details with TRUE streaming...*");
    const metadata = await getMovieMetadata(selected.movieUrl);

    let msg = `───────────────────────── 
*🎬 ${metadata.title}*
───────────────────────── 
*📝 Language:* ${metadata.language}
*⏱️ Duration:* ${metadata.duration}
*⭐ IMDb:* ${metadata.imdb}
*🎭 Genres:* ${metadata.genres.join(", ")}
*🎥 Directors:* ${metadata.directors.join(", ")}
───────────────────────── 
*🔄 Getting TRUE streaming links...*`;

    if (metadata.thumbnail) {
        await danuwa.sendMessage(from, { 
            image: { url: metadata.thumbnail }, 
            caption: msg,
            contextInfo: {           
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    newsletterName: channelName,
                    serverMessageId: -1
                }
            }
        }, { quoted: mek });
    } else {
        await danuwa.sendMessage(from, { text: msg }, { quoted: mek });
    }

    const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
    if (!downloadLinks.length) {
        setTimeout(() => memoryMonitor.stop(), 1000);
        return reply("*❌ No streaming links found!*\n\nEither no links or files exceed 2GB WhatsApp limit.");
    }

    pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

    if (config.BUTTON) {
        const buttons = downloadLinks.map((d, i) => ({ 
            id: `${i+1}`, 
            text: `🎬 ${d.quality} (${d.size})` 
        }));
        
        await sendButtons(danuwa, from, { 
            text: "─────────────────────────\n*📝 CHOOSE STREAMING QUALITY 🚀*\n*💡 TRUE Streaming: Zero bot memory usage*\n─────────────────────────", 
            buttons 
        }, { quoted: mek });
    } else {
        let text = `─────────────────────────
*📝 CHOOSE STREAMING QUALITY 🚀*
─────────────────────────
*💡 TRUE Streaming Features:*
• Zero bot memory usage
• No buffering in VPS
• Direct source streaming
• Supports up to 2GB
─────────────────────────
`;
        
        downloadLinks.forEach((d, i) => {
            text += `${i+1}. 🎬 *${d.quality}* (${d.size})\n`;
        });
        
        text += `\n─────────────────────────\n`;
        text += `*📝 Reply with number (1-${downloadLinks.length})*\n`;
        text += `*🚀 Files will TRUE stream from source*`;
        
        reply(text);
    }
    
    console.log('\x1b[33m⏳ Waiting for quality selection...\x1b[0m');
});

/* ================= COMMAND: TRUE STREAMING QUALITY SELECTION ================= */
cmd({
    filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (danuwa, mek, m, { body, sender, reply, from }) => {

    await danuwa.sendMessage(from, { react: { text: "✅", key: m.key } });
    
    const index = parseInt(body) - 1;
    const { movie } = pendingQuality[sender];
    delete pendingQuality[sender];

    const selectedLink = movie.downloadLinks[index];
    console.log(`\x1b[34m🚀 Starting TRUE streaming: ${selectedLink.quality} - ${selectedLink.size}\x1b[0m`);
    
    reply(`*🚀 Starting TRUE streaming of ${selectedLink.quality}...*\n\n*📦 Size: ${selectedLink.size}*\n*💡 Method: Direct URL (Zero bot memory)*`);

    try {
        // Create safe filename
        const safeFileName = `${movie.metadata.title.substring(0,50)} - ${selectedLink.quality}.mp4`
            .replace(/[^\w\s.-]/gi,'')
            .replace(/\s+/g, ' ')
            .trim();
        
        const caption = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
*🚀 Method:* TRUE Streaming
*💡 Memory Usage:* Zero bot memory
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
        
        // Use TRUE streaming method
        await trueStreamToWhatsApp(
            danuwa, 
            from, 
            selectedLink.link,
            safeFileName,
            caption,
            mek
        );
        
        console.log(`\x1b[32m✅ TRUE Streaming completed successfully!\x1b[0m`);
        
    } catch (error) {
        console.error(`\x1b[31m❌ Streaming error:\x1b[0m`, error);
        
        // Fallback: Send direct link
        reply(`*⚠️ Streaming failed, sending direct download link...*`);
        
        const downloadMessage = `───────────────────────── 
*🎬 ${movie.metadata.title}*
───────────────────────── 
*📊 Quality:* ${selectedLink.quality}
*💾 Size:* ${selectedLink.size}
───────────────────────── 
*🔗 Direct Download Link:*
\`\`\`
${selectedLink.link}
\`\`\`
*📝 Instructions:*
1. Copy link above
2. Use download manager
3. Or open in browser
4. Max 2GB supported
─────────────────────────        
🎥 Powered By *DANUKA DISANAYAKA* 🔥`;
        
        await danuwa.sendMessage(from, { 
            text: downloadMessage,
            contextInfo: {       
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    newsletterName: channelName,
                    serverMessageId: -1
                }
            }
        }, { quoted: mek });
        
    } finally {
        // Cleanup and stop monitoring
        setTimeout(() => {
            // Force cleanup
            httpAgent.destroy();
            httpsAgent.destroy();
            
            // Stop memory monitor
            memoryMonitor.stop();
            
            console.log(`\x1b[32m✨ TRUE Streaming operation completed!\x1b[0m`);
            console.log(`\x1b[32m💾 Memory should be low if TRUE streaming worked\x1b[0m`);
            
            // Force garbage collection if available
            if (global.gc) {
                setTimeout(() => {
                    global.gc();
                    console.log(`\x1b[32m🧹 Final garbage collection completed\x1b[0m`);
                }, 2000);
            }
        }, 3000);
    }
});

/* ================= CLEANUP ================= */
setInterval(() => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes
    
    // Cleanup pending searches
    for (const s in pendingSearch) {
        if (now - pendingSearch[s].timestamp > timeout) {
            console.log(`\x1b[33m🧹 Cleaning expired search: ${s}\x1b[0m`);
            delete pendingSearch[s];
        }
    }
    
    // Cleanup pending quality selections
    for (const s in pendingQuality) {
        if (now - pendingQuality[s].timestamp > timeout) {
            console.log(`\x1b[33m🧹 Cleaning expired quality: ${s}\x1b[0m`);
            delete pendingQuality[s];
        }
    }
    
    // Auto-cleanup HTTP agents periodically
    if (Math.random() < 0.1) { // 10% chance on each interval
        httpAgent.destroy();
        httpsAgent.destroy();
        console.log(`\x1b[33m🔄 HTTP agents refreshed for memory cleanup\x1b[0m`);
    }
    
    // Auto-stop monitor if no activity
    if (memoryMonitor.isMonitoring && Object.keys(pendingSearch).length === 0 && Object.keys(pendingQuality).length === 0) {
        const lastActivity = Date.now() - Math.min(
            ...Object.values(pendingSearch).map(s => s.timestamp),
            ...Object.values(pendingQuality).map(q => q.timestamp),
            Date.now()
        );
        
        if (lastActivity > 180000) { // 3 minutes
            console.log(`\x1b[33m⏰ No activity for 3 min, stopping monitor...\x1b[0m`);
            memoryMonitor.stop();
        }
    }
}, 60000); // Check every minute

// Export for other plugins
module.exports = { 
    pendingSearch, 
    pendingQuality,
    searchMovies,
    getMovieMetadata,
    getPixeldrainLinks,
    trueStreamToWhatsApp,
    memoryMonitor
};
