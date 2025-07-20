const { cmd } = require("../command");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");

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

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    const screenshotPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();

    const caption = `╭──〔 *📷 Website Screenshot* 〕──⬣
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
    reply("❌ *Failed to capture the website.*\nPossible reasons:\n• Invalid or slow-loading site\n• Puppeteer crashed\n• URL is incorrect");
  }
});
