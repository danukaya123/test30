const { cmd } = require("../command");
const { ytmp3, ytmp4, tiktok, instagram, twitter } = require("sadaslk-dlcore");
const yts = require("yt-search");

async function getYoutube(query) {
  const isUrl = /(youtube\.com|youtu\.be)/i.test(query);
  if (isUrl) {
    const id = query.split("v=")[1] || query.split("/").pop();
    return await yts({ videoId: id });
  }

  const search = await yts(query);
  if (!search.videos.length) return null;
  return search.videos[0];
}

/* ===================== YTMP3 ===================== */
cmd(
  {
    pattern: "ytmp3",
    alias: ["yta", "song"],
    desc: "Download YouTube MP3 by name or link",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🎵 Send song name or YouTube link");

      const video = await getYoutube(q);
      if (!video) return reply("❌ No results found");

      const caption = `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
════════════════════════     
🔮  Ｄ  Ａ  Ｎ  Ｕ  Ｗ  Ａ  －  Ｍ  Ｄ  🔮  
      🎧 𝙎𝙊𝙉𝙂 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍 🎧  
════════════════════════   

🎼 Let the rhythm guide you... 🎼
🚀 Pow. By *DANUKA DISANAYAKA* 🔥
─────────────────────────
🎵 *${video.title}*

👤 Channel: ${video.author.name}
⏱ Duration: ${video.timestamp}
👀 Views: ${video.views.toLocaleString()}
🔗 ${video.url}
─────────────────────────
🎼 Made with ❤️ by *DANUKA DISANAYAKA💫*        
`;

      await danuwa.sendMessage(
        from,
        { image: { url: video.thumbnail }, caption },
        { quoted: mek }
      );

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const data = await ytmp3(video.url);
      if (!data?.url) return reply("❌ Failed to download MP3");

      const sent = await danuwa.sendMessage(
        from,
        { audio: { url: data.url }, mimetype: "audio/mpeg" },
        { quoted: mek }
      );

      await danuwa.sendMessage(from, {
        react: { text: "✅", key: sent.key },
      });
    } catch (e) {
      console.log("YTMP3 ERROR:", e);
      reply("❌ Error while downloading MP3");
    }
  }
);

/* ===================== YTMP4 ===================== */
cmd(
  {
    pattern: "ytmp4",
    alias: ["ytv", "video"],
    desc: "Download YouTube MP4 by name or link",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🎬 Send video name or YouTube link");

      const video = await getYoutube(q);
      if (!video) return reply("❌ No results found");

      const caption = `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
════════════════════════     
🔮  Ｄ  Ａ  Ｎ  Ｕ  Ｗ  Ａ  －  Ｍ  Ｄ  🔮  
      🎬 𝙑𝙄𝘿𝙀𝙊 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍 🎬  
════════════════════════   
🎬 *${video.title}*

👤 Channel: ${video.author.name}
⏱ Duration: ${video.timestamp}
👀 Views: ${video.views.toLocaleString()}
📅 Uploaded: ${video.ago}
🔗 ${video.url}
─────────────────────────
🎬 Made with ❤️ by *DANUKA DISANAYAKA💫* 
`;

      await danuwa.sendMessage(
        from,
        { image: { url: video.thumbnail }, caption },
        { quoted: mek }
      );

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const data = await ytmp4(video.url, {
        format: "mp4",
        videoQuality: "720",
      });

      if (!data?.url) return reply("❌ Failed to download video");

      const sent = await danuwa.sendMessage(
        from,
        {
          video: { url: data.url },
          mimetype: "video/mp4",
          fileName: data.filename || "youtube_video.mp4",
        },
        { quoted: mek }
      );

      await danuwa.sendMessage(from, {
        react: { text: "✅", key: sent.key },
      });
    } catch (e) {
      console.log("YTMP4 ERROR:", e);
      reply("❌ Error while downloading video");
    }
  }
);

/* ===================== TIKTOK ===================== */
cmd(
  {
    pattern: "tiktok",
    alias: ["tt"],
    desc: "Download TikTok video",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📱 Send TikTok link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const data = await tiktok(q);
      if (!data?.no_watermark)
        return reply("❌ Failed to download TikTok video");

      const caption = `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
══════════════════════     
🔮 Ｄ Ａ Ｎ Ｕ Ｗ Ａ－Ｍ Ｄ 🔮  
🎬 *_TIKTOK_* 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍 🎬  
══════════════════════  

❤️ Download your Tiktok video ❤️
🚀 Pow. By *DANUKA DISANAYAKA* 🔥
──────────────────────
🎵 *${data.title || "TikTok Video"}*

👤 Author: ${data.author || "Unknown"}
⏱ Duration: ${data.runtime}s
`;

      const sent = await danuwa.sendMessage(
        from,
        { video: { url: data.no_watermark }, caption },
        { quoted: mek }
      );

      await danuwa.sendMessage(from, {
        react: { text: "✅", key: sent.key },
      });
    } catch (e) {
      console.log("TIKTOK ERROR:", e);
      reply("❌ Error while downloading TikTok video");
    }
  }
);

/* ===================== INSTAGRAM ===================== */
cmd(
  {
    pattern: "instagram",
    alias: ["ig"],
    desc: "Download Instagram video",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📸 Send Instagram link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const data = await instagram(q);
      if (!data?.url) return reply("❌ Failed to download Instagram video");

      const caption = `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
══════════════════════     
🔮 Ｄ Ａ Ｎ Ｕ Ｗ Ａ－Ｍ Ｄ 🔮
📸 *_INSTA_* 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍 📸
══════════════════════

✨ Enjoy your Instagram video ✨
🚀 Pow. By *DANUKA DISANAYAKA* 🔥
──────────────────────
📸 *Instagram Video*
──────────────────────
📸 Made with ❤️ by *DANUKA DISANAYAKA💫*
`;

      const sent = await danuwa.sendMessage(
        from,
        { video: { url: data.url }, caption },
        { quoted: mek }
      );

      await danuwa.sendMessage(from, {
        react: { text: "✅", key: sent.key },
      });
    } catch (e) {
      console.log("INSTAGRAM ERROR:", e);
      reply("❌ Error while downloading Instagram video");
    }
  }
);

/* ===================== TWITTER ===================== */
cmd(
  {
    pattern: "twitter",
    alias: ["tw", "x"],
    desc: "Download Twitter/X video",
    category: "download",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("🐦 Send Twitter/X link");

      reply("*පොඩ්ඩක් ඉදහම් සනික එවන්නම් ❤️‍🩹👀*");

      const data = await twitter(q);
      if (!data?.url) return reply("❌ Failed to download Twitter video");

      const caption = `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
══════════════════════     
🔮 Ｄ Ａ Ｎ Ｕ Ｗ Ａ－Ｍ Ｄ 🔮
🐦 *_TWITTER_* 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍 🐦
══════════════════════

🔥 Your Twitter video is ready 🔥
🚀 Pow. By *DANUKA DISANAYAKA* 🔥
──────────────────────
🐦 *Twitter Video*
──────────────────────
🐦 Made with ❤️ by *DANUKA DISANAYAKA💫*
`;

      const sent = await danuwa.sendMessage(
        from,
        { video: { url: data.url }, caption },
        { quoted: mek }
      );

      await danuwa.sendMessage(from, {
        react: { text: "✅", key: sent.key },
      });
    } catch (e) {
      console.log("TWITTER ERROR:", e);
      reply("❌ Error while downloading Twitter video");
    }
  }
);
