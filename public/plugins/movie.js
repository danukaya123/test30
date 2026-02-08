const config = require('../config');
const { cmd } = require('../command');
const { sleep } = require('../lib/functions');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

cmd({
  pattern: "shutdown",
  react: '🛑',
  desc: "Stop the bot",
  category: "main",
  filename: __filename
}, async (
  conn, mek, m, {
    from, sender, reply
  }
) => {
  try {
    // normalize owner & sender JIDs
    const ownerJid = jidNormalizedUser(
      config.BOT_OWNER + '@s.whatsapp.net'
    );
    const senderJid = jidNormalizedUser(sender);

    // owner check
    if (senderJid !== ownerJid) {
      return reply("❌ This command is only for the bot owner.");
    }

    await reply("🛑 Bot is shutting down...");

    await sleep(1500);

    // OPTIONAL: Heroku-safe stop flag
    process.env.BOT_DISABLED = "true";

    console.log("Bot shutdown triggered by owner");

    // exit process
    process.exit(0);

  } catch (e) {
    console.error("Shutdown error:", e);
    reply("❌ Failed to shutdown:\n" + e);
  }
});
