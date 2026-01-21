const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/bkhbq/";

cmd({
  pattern: "removebg",
  react: "🪄",
  desc: "Remove image background",
  category: "image",
  filename: __filename,
}, async (danuwa, mek, m, { from, reply }) => {
  try {
    // ❌ No image
    if (!mek._mediaBuffer || mek._mediaType !== "imageMessage") {
      return reply("📸 *Send an image with caption `.removebg`*");
    }

    await reply("🪄 Removing background, please wait...");

    // 🧠 Convert buffer → Blob
    const imageBlob = new Blob([mek._mediaBuffer], {
      type: "image/png",
    });

    // 🔗 Connect HF Space
    const app = await Client.connect(HF_SPACE);

    const result = await app.predict("/predict", [imageBlob]);

    let output = result?.data?.[0];
    if (!output) return reply("❌ Failed to process image.");

    let imageBuffer;

    // ✅ Case 1: data URL
    if (typeof output === "string" && output.startsWith("data:image")) {
      const base64 = output.split(",")[1];
      imageBuffer = Buffer.from(base64, "base64");
    }

    // ✅ Case 2: object with data URL
    else if (typeof output === "object" && output.url) {
      const base64 = output.url.split(",")[1];
      imageBuffer = Buffer.from(base64, "base64");
    }

    else {
      return reply("❌ Unsupported output format.");
    }

    // 📤 Send image (BUFFER – SAFE)
    await danuwa.sendMessage(
      from,
      {
        image: imageBuffer,
        caption: "✨ *Background removed successfully!*",
      },
      { quoted: mek }
    );

  } catch (err) {
    console.error("RemoveBG error:", err);
    reply("❌ Error while removing background.");
  }
});
