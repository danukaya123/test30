// removebg.js
const { cmd } = require("../command");
const { client } = require("@gradio/client");
const fetch = require("node-fetch");

const HF_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/bkhbq/";

/* ================= COMMAND: REMOVEBG ================= */
cmd({
  pattern: "removebg",
  react: "🖼️",
  desc: "Remove background from an image",
  category: "utility",
  filename: __filename
}, async (danuwa, mek, m, { from, reply, body, isImage }) => {

  if (!m.quoted && !isImage) 
    return reply("*❌ Please send or reply to an image with the caption .removebg*");

  try {
    // 1️⃣ Get the image buffer
    const mediaMessage = m.quoted ? m.quoted : m;
    const buffer = await danuwa.downloadMedia(mediaMessage);

    if (!buffer) return reply("*❌ Failed to read image*");

    reply("*⏳ Processing image... Removing background, please wait!*");

    // 2️⃣ Initialize Gradio client
    const app = await client(HF_SPACE);

    // 3️⃣ Send image buffer to HF Space predict
    const result = await app.predict("/predict", [buffer]);

    let fileUrl = result?.data?.[0];
    if (!fileUrl) return reply("*❌ Failed to remove background*");

    // 4️⃣ Handle relative URLs
    if (fileUrl.startsWith("/")) fileUrl = HF_SPACE.replace(/\/$/, "") + fileUrl;

    // 5️⃣ Fetch the resulting image
    const res = await fetch(fileUrl);
    const outputBuffer = Buffer.from(await res.arrayBuffer());

    // 6️⃣ Send back to user
    await danuwa.sendMessage(from, { 
      image: outputBuffer, 
      caption: "✨ Background removed!" 
    }, { quoted: mek });

  } catch (error) {
    console.error("RemoveBG error:", error);
    reply(`*❌ RemoveBG failed:* ${error.message || error}`);
  }
});
