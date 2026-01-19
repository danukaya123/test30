const { cmd } = require('../command');
const { sendButtons } = require('gifted-btns');
const config = require('../config');
const os = require('os');
const fs = require('fs');
const path = require("path");

// ------------------ Helper: Uptime ------------------
const formatUptime = (seconds) => {
    const pad = (s) => (s < 10 ? '0' + s : s);
    const days = Math.floor(seconds / (24 * 3600));
    const hrs = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days > 0 ? `${days}d ` : ''}${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
};

// ------------------ Helper: Extract body ------------------
function extractBody(mek, m) {
    const type = Object.keys(mek.message || {})[0];
    return (type === 'conversation') ? mek.message.conversation :
           (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
           (type === 'templateButtonReplyMessage') ? mek.message.templateButtonReplyMessage?.selectedId :
           (type === 'interactiveResponseMessage') ? (() => {
              try {
                  const json = JSON.parse(
                      mek.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
                  );
                  return json?.id || '';
              } catch { return ''; }
           })() :
           (type === 'imageMessage') ? mek.message.imageMessage?.caption :
           (type === 'videoMessage') ? mek.message.videoMessage?.caption :
           m.msg?.text ||
           m.msg?.conversation ||
           m.msg?.caption ||
           m.msg?.selectedButtonId ||
           m.msg?.singleSelectReply?.selectedRowId ||
           '';
}

// ------------------ Alive Plugin ------------------
cmd({
    pattern: "alive",
    react: "👀",
    desc: "Check if the bot is online and functioning.",
    category: "main",
    filename: __filename
}, async (danuwa, mek, m, { from, quoted, reply }) => {
    try {
        const uptime = formatUptime(process.uptime());
        const platform = os.platform();
        const userName = m.pushName || "User";

        const videoPath = path.join(__dirname, "../media/0908.mp4");
        const aliveImg = 'https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/Alive.png?raw=true'; 
        const voicePath = './media/alive.ogg'; 

        const channelJid = '120363418166326365@newsletter'; 
        const channelName = '🍁 ＤＡＮＵＷＡ－ 〽️Ｄ 🍁';

        const aliveCaption = `╭─────── ⭓ ⭓ ⭓  ─────────╮
│          🧿 SYSTEM ONLINE 🧿       │
╰──────────────⟡───────╯
│ 👋 𝗛𝗲𝘆 ${userName},
│ 🍁 *PREFIX:* "."
│ ⚡ *BOT NAME:* ${config.BOT_NAME || '🌀 DANUWA-MD 🌀'}
│ 🧭 *UPTIME:* ${uptime}
│ 🔋 *PLATFORM:* ${platform}
│ 🧩 *VERSION:* ${config.VERSION || '1.0.0'}
╰───────────────⬣
⚙️ Made with ❤️ by
╰🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥`;

        // ------------------ Buttons ------------------
        const buttons = [
            { id: ".menu", text: "📜 Menu" },
            { id: ".owner", text: "👤 Owner" }
        ];

        // ------------------ Send Video ------------------
        if (fs.existsSync(videoPath)) {
            const videoBuffer = fs.readFileSync(videoPath);
            await danuwa.sendMessage(from, {
                video: videoBuffer,
                mimetype: "video/mp4",
                ptv: true
            }, { quoted: mek });
        }

        // ------------------ Send Image + Buttons ------------------
await danuwa.sendMessage(from, {
    image: { url: aliveImg },
    caption: aliveCaption,
    footer: "🌀 DANUWA-MD",
    buttons: buttons,
    headerType: 4,
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: channelName,
            serverMessageId: -1
        }
    }
}, { quoted: mek });



        // ------------------ Mini Reply Handler ------------------
        const body = extractBody(mek, m);
        if (body === ".menu") {
            require('./menu.js').function(danuwa, mek, m, { from, quoted: mek, body });
        } else if (body === ".owner") {
            require('./owner.js').function(danuwa, mek, m, { from, quoted: mek, body });
        }

    } catch (err) {
        console.error(err);
        reply(`❌ Error: ${err.message}`);
    }
});
