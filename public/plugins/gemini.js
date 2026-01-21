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

      let aiReply = "";
      let attempts = 0;
      const maxAttempts = 10; // max 10 tries
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));

      while (!aiReply && attempts < maxAttempts) {
        attempts++;

        const result = await client.predict(
          {
            inputs: q,
            top_p: 1,
            temperature: 1,
            chat_counter: 0,
            chatbot: [],
          },
          "/predict"
        );

        // result is a tuple [chatbotArray, number, status, textbox]
        const chatbotArray = result[0];

        if (Array.isArray(chatbotArray) && chatbotArray.length > 0) {
          const lastPair = chatbotArray[chatbotArray.length - 1];
          if (Array.isArray(lastPair)) {
            // AI reply is the string that is not equal to user input
            aiReply = lastPair.find((v) => typeof v === "string" && v.trim() !== q)?.trim() || "";
          }
        }

        if (!aiReply) {
          // if still empty, wait 1 second and retry
          await wait(1000);
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
