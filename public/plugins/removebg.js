const { cmd } = require("../command");
const { Client } = require("@gradio/client");
const fetch = require("node-fetch");

const HF_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/bkhbq/";

cmd({
  pattern: "removebg",
  react: "🪄",
  desc: "Remove image background",
  category: "image",
  filename: __filename,
}, async (danuwa, mek, m, { from, reply }) => {
  try {
    if (!mek._mediaBuffer || mek._mediaType !== "imageMessage")
      return reply("📸 Send an image with caption `.removebg`");

    await reply("🪄 Removing background, please wait...");

    const imageBlob = new Blob([mek._mediaBuffer], { type: "image/png" });
    const app = await Client.connect(HF_SPACE);

    const result = await app.predict("/predict", [imageBlob]);

    // -----------------------------
    // 1️⃣ If result is a file URL
    // -----------------------------
    let buffer;

    if (result.data?.[0]?.url) {
      let tempUrl = result.data[0].url;
      if (tempUrl.startsWith("/")) tempUrl = HF_SPACE.replace(/\/$/, "") + tempUrl;
      const res = await fetch(tempUrl);
      buffer = Buffer.from(await res.arrayBuffer());
    }

    // -----------------------------
    // 2️⃣ If result is base64 data
    // -----------------------------
    else if (result.data?.[0]?.data) {
      buffer = Buffer.from(result.data[0].data, "base64");
    }

    else return reply("❌ Failed to get processed image.");

    await danuwa.sendMessage(
      from,
      { image: buffer, caption: "✨ Background removed!" },
      { quoted: mek }
    );

  } catch (err) {
    console.error("RemoveBG error:", err);
    reply(`❌ Error while removing background: ${err.message}`);
  }
});
