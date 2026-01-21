const { cmd } = require("../command");

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    desc: "Start or stop Gemini chat mode",
    category: "ai",
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply }) => {

    // STOP MODE
    if (q?.toLowerCase() === "stop") {
      global.geminiSessions.delete(from);
      return reply("✅ Gemini chat mode stopped. You can use other commands now.");
    }

    // START MODE
    reply(
      "🤖 *Gemini chat mode activated.*\n\n" +
      "You can now chat naturally without using `.gemini`.\n" +
      "Type `.gemini stop` to exit."
    );

    await handleGeminiChat(conn, mek, from, q || "Hello!");
  }
);
