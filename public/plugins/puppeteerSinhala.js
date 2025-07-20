// plugins/puppeteerSinhala.js
const puppeteer = require("puppeteer");

async function launchWithSinhala() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Inject Sinhala font support
  await page.addStyleTag({
    content: `* { font-family: "Noto Sans Sinhala", sans-serif !important; }`
  });

  return { browser, page };
}

module.exports = { launchWithSinhala };
