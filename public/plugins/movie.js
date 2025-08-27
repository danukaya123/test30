const { cmd, commands } = require('../command')
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "cinesubz",
    alias: ["cs"],
    desc: "Download movies from cinesubz.lk",
    category: "download",
    react: "🎬"
}, async (robin, mek, m, { from, q, reply }) => {
    if (!q) return reply("🔍 Provide a CineSubz movie page URL.");

    const browser = await puppeteer.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
    ]
});
    const page = await browser.newPage();
    await page.goto(q, { waitUntil: "networkidle2" });

    // Wait and grab all quality rows
    await page.waitForSelector("tr.clidckable-rowdd");
    const qualities = await page.$$eval("tr.clidckable-rowdd", rows =>
        rows.map((row, i) => {
            const quality = row.querySelector("td:nth-child(1)")?.innerText.trim();
            const size = row.querySelector("td:nth-child(2)")?.innerText.trim();
            const lang = row.querySelector("td:nth-child(3)")?.innerText.trim();
            const url = row.getAttribute("data-href");
            return { index: i + 1, quality, size, lang, url };
        })
    );

    await browser.close();

    if (!qualities.length) return reply("❌ No download options found.");

    // Show options to user
    let listText = `🎬 *Available Qualities:*\n\n`;
    for (let ql of qualities) {
        listText += `${ql.index}. *${ql.quality}* (${ql.size}, ${ql.lang})\n`;
    }
    listText += `\n👉 Reply with the number to download.`;

    await reply(listText);

    // Wait for user reply (hook into message event)
    robin.ev.once('messages.upsert', async (msg) => {
        try {
            const userMsg = msg.messages[0];
            if (!userMsg.message.conversation) return;
            const selected = parseInt(userMsg.message.conversation.trim());

            if (isNaN(selected) || selected < 1 || selected > qualities.length) {
                return robin.sendMessage(from, { text: "❌ Invalid selection." }, { quoted: mek });
            }

            const chosen = qualities[selected - 1];
            const browser2 = await puppeteer.launch({ headless: true });
            const page2 = await browser2.newPage();

            await page2.goto(chosen.url, { waitUntil: "networkidle2" });

            // Wait and get "Download Now" button
            await page2.waitForSelector("a#dwnbtn, a[href*='download']", { timeout: 20000 });
            const finalUrl = await page2.$eval("a#dwnbtn, a[href*='download']", el => el.href);

            await browser2.close();

            // Send link to user
            await robin.sendMessage(from, {
                text: `✅ *${chosen.quality}* (${chosen.size})\n\n🔗 Download: ${finalUrl}`
            }, { quoted: mek });

        } catch (err) {
            console.error("Error:", err);
            robin.sendMessage(from, { text: "⚠️ Failed to get final download link." }, { quoted: mek });
        }
    });
});
