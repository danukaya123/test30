const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

// 🧠 Per-chat session memory
const sessions = new Map();

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

      // 🧹 Reset command
      if (q.toLowerCase() === "reset") {
        sessions.delete(from);
        return reply("🧹 Conversation memory cleared.");
      }

      await reply("🤖 Thinking...");

      // 🔐 Get or create session
      let session = sessions.get(from);

      if (!session) {
        const client = await Client.connect(HF_SPACE);
        await client.predict("/enable_inputs", {});

        session = {
          client,
          chatbot: [],
          counter: 0,
        };

        sessions.set(from, session);
      }

      // 🧠 Use SAME client + memory
      const result = await session.client.predict("/predict", {
        inputs: q,
        top_p: 1,
        temperature: 1,
        chat_counter: session.counter,
        chatbot: session.chatbot,
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

      // 🧠 Update memory
      session.chatbot.push([q, aiReply]);
      session.counter = session.chatbot.length;

      // Limit history
      if (session.chatbot.length > 10) {
        session.chatbot.shift();
        session.counter--;
      }

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
