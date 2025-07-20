const puppeteer = require("puppeteer");

async function launchWithSinhala() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Inject Google Font for Sinhala (Noto Sans Sinhala)
  await page.evaluate(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  });

  // Apply the font globally via style tag
  await page.addStyleTag({
    content: `* { font-family: 'Noto Sans Sinhala', sans-serif !important; }`
  });

  return { browser, page };
}

module.exports = { launchWithSinhala };
