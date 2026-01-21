const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    desc: "Ask AI anything",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a question after `.gemini`");

      await reply("🤖 AI is thinking, please wait...");

      const client = await Client.connect(HF_SPACE);

      let chatbot = [];
      let counter = 0;
      let aiReply = "";

      // 🔁 Polling loop (max ~10 seconds)
      for (let i = 0; i < 5; i++) {
        const result = await client.predict("/predict", [
          q,
          1,
          1,
          counter,
          chatbot,
        ]);

        chatbot = result[0];
        counter = result[1];

        if (Array.isArray(chatbot) && chatbot.length > 0) {
          const last = chatbot[chatbot.length - 1];
          if (Array.isArray(last) && typeof last[1] === "string") {
            aiReply = last[1];
            break;
          }
        }

        await sleep(2000); // wait 2 sec before retry
      }

      if (!aiReply)
        aiReply = "🤖 AI is still generating. Please try again.";

      await danuwa.sendMessage(
        from,
        { text: aiReply },
        { quoted: mek }
      );

    } catch (err) {
      console.error("HF AI error:", err);
      reply("❌ AI error occurred.");
    }
  }
);
