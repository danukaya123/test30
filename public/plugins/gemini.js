const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const sessions = {}; // store chat history per user

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    alias: ["chat", "gpt", "gemini"],
    desc: "Ask AI questions using Hugging Face ChatGPT Space",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📌 Send a question after the command, e.g., `.ai Hello`");

      const uid = from; // per user session
      if (!sessions[uid]) sessions[uid] = { chatbot: [], counter: 0 };

      const client = await Client.connect("yuntian-deng/ChatGPT");

      let aiReply = null;
      let attempts = 0;
      const maxAttempts = 10; // max 10 retries
      const waitTime = 1000; // 1 second between retries

      // Retry loop: wait until AI gives real string or max 10 seconds
      while (!aiReply && attempts < maxAttempts) {
        attempts++;
        const result = await client.predict("/predict", {
          inputs: q,
          top_p: 1,
          temperature: 0.8,
          chat_counter: sessions[uid].counter,
          chatbot: sessions[uid].chatbot,
        });

        // result.data: [chatbot array, chat_counter, status, input echo]
        const chatbotArray = result.data[0];
        const counter = result.data[1];

        sessions[uid].counter = counter; // update counter
        sessions[uid].chatbot = chatbotArray; // update chat history

        // Check last message from AI
        if (Array.isArray(chatbotArray) && chatbotArray.length > 0) {
          const lastPair = chatbotArray[chatbotArray.length - 1];
          if (Array.isArray(lastPair) && typeof lastPair[1] === "string") {
            aiReply = lastPair[1].trim();
          }
        }

        if (!aiReply) {
          // wait 1 second before retry
          await new Promise((res) => setTimeout(res, waitTime));
        }
      }

      if (!aiReply) return reply("⚠️ AI is busy, try again in a few seconds.");

      // Send AI reply
      await danuwa.sendMessage(
        from,
        { text: aiReply },
        { quoted: mek }
      );

    } catch (e) {
      console.log("HF AI ERROR:", e);
      reply("❌ Error contacting AI. Try again later.");
    }
  }
);
