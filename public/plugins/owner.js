const { cmd } = require("../command");
const { sendButtons } = require("gifted-btns");

cmd(
  {
    pattern: "owner",
    react: "👤",
    desc: "Show bot owner information",
    category: "main",
    filename: __filename,
  },
  async (danuwa, mek, m, { from }) => {
    try {
      const ownerCaption = `╭─────── ⭓ ⭓ ⭓ ─────────╮
│        👤 OWNER INFO 👤        │
╰──────────────⟡───────╯
│ 👋 𝗛𝗲𝘆, I’m
│ 🔥 *Danuka Dissanayake*
│
│ 📱 *WhatsApp:* 0776121326
│ 💻 *GitHub:* DANUWA-MD
│ ▶️ *YouTube:* Quizontal
╰───────────────⬣
⚙️ Made with ❤️ by
╰🔥 𝘿𝘼𝙉𝙐𝙆𝘼 𝘿𝙄𝙎𝘼𝙉𝘼𝙔𝘼𝙆𝘼 🔥`;

      await danuwa.sendMessage({caption: ownerCaption, image: {url: "https://github.com/DANUWA-MD/DANUWA-BOT/blob/main/images/Danuka%20Disanayaka.jpg?raw=true"},{ quoted: mek });

      await sendButtons(
        danuwa,
        from,
        {
          // ⚠️ REQUIRED by gifted-btns
          text: `     *Owner contact options*
`,


          buttons: [
            {
              name: "cta_call",
              buttonParamsJson: JSON.stringify({
                display_text: "📞 Call Owner",
                phone_number: "94776121326"
              })
            },
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy WhatsApp Number",
                copy_code: "0776121326"
              })
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "💻 GitHub Profile",
                url: "http://github.com/DANUWA-MD"
              })
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "▶️ YouTube Channel",
                url: "http://youtube.com/@quizontal"
              })
            }
          ]
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error("OWNER PLUGIN ERROR:", e);
    }
  }
);
