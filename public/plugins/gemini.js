const { cmd } = require("../command");
const { Client } = require("@gradio/client");

// ================= SESSION MEMORY =================
const sessions = {};
const MAX_HISTORY = 6;

// ================= AI COMMAND =================
cmd(
  {
    pattern: "gemini",
    react: "🤖",
    alias: ["chat", "gpt"],
    desc: "Chat with AI (memory enabled)",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply, sender }) => {
    try {
      if (!q) return reply("🤖 Ask me something...\nExample: `.ai hello`");

      const uid = sender || from;

      if (!sessions[uid]) {
        sessions[uid] = {
          chatbot: [],
          counter: 0,
        };
      }

      const client = await Client.connect("yuntian-deng/ChatGPT");

      const result = await client.predict("/predict", {
        inputs: q,
        top_p: 1,
        temperature: 0.8,
        chat_counter: sessions[uid].counter,
        chatbot: sessions[uid].chatbot,
      });

      const chatbot = result.data[0];
      const counter = result.data[1];

      let aiReply = null;

      // ✅ CORRECT EXTRACTION (VERY IMPORTANT)
      if (Array.isArray(chatbot) && chatbot.length > 0) {
        const lastPair = chatbot[chatbot.length - 1];
        if (Array.isArray(lastPair) && typeof lastPair[1] === "string") {
          aiReply = lastPair[1];
        }
      }

      if (!aiReply) {
        return reply("🤖 AI is busy, try again.");
      }

      // Save memory (limit size)
      sessions[uid].chatbot = chatbot.slice(-MAX_HISTORY);
      sessions[uid].counter = counter;

      await reply(aiReply.trim());

    } catch (err) {
      console.log("AI ERROR:", err);
      reply("❌ AI error occurred. Try again later.");
    }
  }
);
