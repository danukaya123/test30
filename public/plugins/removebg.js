const { cmd } = require("../command");
const fetch = require("node-fetch");
const FormData = require("form-data");

const CORS_PROXY = "https://removebg-cors.vercel.app/api"; // same as your website

cmd({
  pattern: "removebg",
  react: "🪄",
  desc: "Remove image background",
  category: "image",
  filename: __filename,
}, async (danuwa, mek, m, { from, reply }) => {
  try {
    // Validate image
    if (!mek._mediaBuffer || mek._mediaType !== "imageMessage")
      return reply("📸 Send an image with caption `.removebg`");

    await reply("🪄 Removing background, please wait...");

    // Prepare file upload using FormData
    const formData = new FormData();
    formData.append("files", Buffer.from(mek._mediaBuffer), {
      filename: "image.png",
      contentType: "image/png",
    });

    // Call the CORS proxy to process the image
    const response = await fetch(`${CORS_PROXY}/image-process`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server returned ${response.status}: ${text}`);
    }

    const result = await response.json();

    if (!result.success || !result.data?.[0])
      return reply("❌ Failed to process image.");

    const processedUrl = result.data[0]; // absolute URL via proxy

    // Fetch the processed image
    const imageRes = await fetch(processedUrl);
    if (!imageRes.ok) throw new Error("Failed to download processed image");

    const buffer = Buffer.from(await imageRes.arrayBuffer());

    // Send the background-removed image
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
