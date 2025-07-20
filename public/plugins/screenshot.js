const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { launchWithSinhala } = require("./puppeteerSinhala"); // ✅ use local wrapper

cmd({
  pattern: "ss",
  desc: "Take website screenshot",
  category: "tools",
  use: ".screenshot <url>",
  filename: __filename,
}, async (robin, mek, m, { from, q, reply }) => {
  if (!q) return reply("🖼️ *Please provide a website URL to capture.*\nExample: `.screenshot https://example.com`");

  let url = q.trim();
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;

  try {
    reply("📸 Capturing screenshot, please wait...");

    const { browser, page } = await launchWithSinhala(); // ✅ now Sinhala supported
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    const screenshotPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();

    const caption = `
╭〔 *📷 Website Screenshot* 〕─⬣
┃ 🌐 URL: ${url}
╰───────────────⬣`;

    const buffer = fs.readFileSync(screenshotPath);
    await robin.sendMessage(from, {
      image: buffer,
      caption: caption,
    }, { quoted: mek });

    fs.unlinkSync(screenshotPath);
  } catch (err) {
    console.error("❌ Screenshot error:", err.message);
    reply("❌ *Failed to capture the website.*\nMake sure the URL is valid and Sinhala fonts are installed.");
  }
});
