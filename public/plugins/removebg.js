const { cmd } = require("../command");
const { Client } = require("@gradio/client");
const fetch = require("node-fetch");

// HuggingFace Space URL
const HF_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/bkhbq/";

cmd({
  pattern: "removebg",
  react: "🪄",
  desc: "Remove image background",
  category: "image",
  filename: __filename,
}, async (danuwa, mek, m, { from, reply }) => {
  try {
    // --- 1️⃣ Validate ---
    if (!mek._mediaBuffer || mek._mediaType !== "imageMessage") {
      return reply("📸 Send an image with caption `.removebg`");
    }

    await reply("🪄 Removing background, please wait...");

    // --- 2️⃣ Prepare image blob ---
    const imageBlob = new Blob([mek._mediaBuffer], { type: "image/png" });

    // --- 3️⃣ Connect to Gradio Space ---
    const app = await Client.connect(HF_SPACE);

    // --- 4️⃣ Predict / remove background ---
    const result = await app.predict("/predict", [imageBlob]);

    // --- 5️⃣ Get processed image URL ---
    // result.data[0] is an object {name, data}, data is relative URL like /file=/tmp/…
    const outputObj = result?.data?.[0];
    if (!outputObj || !outputObj.data) {
      return reply("❌ Failed to get processed image URL.");
    }

    let tempUrl = outputObj.data;
    // prepend HF_SPACE origin if relative
    if (tempUrl.startsWith("/")) {
      tempUrl = HF_SPACE.replace(/\/$/, "") + tempUrl;
    }

    // --- 6️⃣ Download processed image ---
    const res = await fetch(tempUrl);
    if (!res.ok) return reply("❌ Failed to download processed image.");
    const buffer = Buffer.from(await res.arrayBuffer());

    // --- 7️⃣ Send back to user ---
    await danuwa.sendMessage(
      from,
      { image: buffer, caption: "✨ Background removed!" },
      { quoted: mek }
    );

  } catch (err) {
    console.error("RemoveBG error:", err);
    reply("❌ Error while removing background.");
  }
});
