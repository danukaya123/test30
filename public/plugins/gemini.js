const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    alias: [],
    desc: "Ask AI anything using Hugging Face Space ChatGPT",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a question after .gemini command");

      reply("🤖 AI is thinking, please wait...");

      const client = await Client.connect(HF_SPACE);

      const result = await client.predict({
        api_name: "/predict",    // ✅ must be inside object
        inputs: q,
        top_p: 1,
        temperature: 1,
        chat_counter: 0,
        chatbot: [],
      });

      // result[0] is chatbot array
      const chatbotArray = result[0];
      let aiReply = "";

      if (Array.isArray(chatbotArray) && chatbotArray.length > 0) {
        const lastPair = chatbotArray[chatbotArray.length - 1];
        if (Array.isArray(lastPair)) {
          aiReply = lastPair.find((v) => typeof v === "string" && v.trim() !== q)?.trim() || "";
        }
      }

      if (!aiReply) aiReply = "🤖 AI is busy, try again later.";

      await danuwa.sendMessage(from, { text: aiReply }, { quoted: mek });

    } catch (e) {
      console.log("HF AI error:", e);
      reply("❌ AI error occurred. Try again later.");
    }
  }
);
