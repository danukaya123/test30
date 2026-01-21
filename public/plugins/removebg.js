const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "https://briaai-bria-rmbg-1-4.hf.space/--replicas/bkhbq/";

/* ==========================
   🖼️ REMOVE BACKGROUND
========================== */
cmd(
  {
    pattern: "removebg",
    react: "🪄",
    desc: "Remove image background",
    category: "image",
    filename: __filename,
  },
  async (danuwa, mek, m, {
    from,
    reply,
  }) => {
    try {
      // ❌ No image
      if (!mek._mediaBuffer || mek._mediaType !== "imageMessage") {
        return reply("📸 *Please send an image with caption `.removebg`*");
      }

      await reply("🪄 Removing background, please wait...");

      // Convert Buffer → Blob
      const imageBlob = new Blob([mek._mediaBuffer], { type: "image/png" });

      // Connect to HF Space
      const app = await Client.connect(HF_SPACE);

      // Call API
      const result = await app.predict("/predict", [
        imageBlob, // image input
      ]);

      const output = result?.data?.[0];

      if (!output) {
        return reply("❌ Failed to remove background.");
      }

      // Send result image
      await danuwa.sendMessage(
        from,
        {
          image: { url: output },
          caption: "✨ *Background removed successfully!*",
        },
        { quoted: mek }
      );

    } catch (err) {
      console.error("RemoveBG error:", err);
      reply("❌ Error while removing background.");
    }
  }
);
