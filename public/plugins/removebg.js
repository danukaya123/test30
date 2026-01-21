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

    // ❗ Use timeout of 60s to avoid hanging
    const result = await Promise.race([
      app.predict("/predict", [imageBlob]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 60000))
    ]);

    let tempUrl = result?.data?.[0];
    if (!tempUrl) return reply("❌ Failed to process image.");

    // ✅ Handle relative URLs
    if (tempUrl.startsWith("/")) tempUrl = HF_SPACE.replace(/\/$/, "") + tempUrl;

    const res = await fetch(tempUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

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
