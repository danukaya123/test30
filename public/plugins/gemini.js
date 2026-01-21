const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

// 🧠 Conversation memory (per chat)
const chatMemory = new Map();

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    desc: "Conversational AI chatbot",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a message after `.gemini`");

      await reply("🤖 Thinking...");

      const client = await Client.connect(HF_SPACE);

      // Required by this Space
      await client.predict("/enable_inputs", {});

      // Get previous conversation
      let memory = chatMemory.get(from) || [];
      let counter = memory.length;

      // Call predict with memory
      const result = await client.predict("/predict", {
        inputs: q,
        top_p: 1,
        temperature: 1,
        chat_counter: counter,
        chatbot: memory,
      });

      const data = result.data;
      let aiReply = "";

      if (Array.isArray(data[0]) && data[0].length > 0) {
        const last = data[0][data[0].length - 1];
        if (Array.isArray(last) && typeof last[1] === "string") {
          aiReply = last[1];
        }
      }

      if (!aiReply) aiReply = "🤖 I couldn’t generate a reply.";

      // 🧠 SAVE conversation
      memory.push([q, aiReply]);

      // Limit memory (prevent crash)
      if (memory.length > 10) memory.shift();

      chatMemory.set(from, memory);

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
