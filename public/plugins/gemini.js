const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

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

      // ✅ REQUIRED: enable inputs (UI does this automatically)
      await client.predict("/enable_inputs", {});

      // ✅ Call predict exactly like docs
      const result = await client.predict("/predict", {
        inputs: q,
        top_p: 1,
        temperature: 1,
        chat_counter: 0,
        chatbot: [],
      });

      /*
        result.data structure:
        [0] chatbot
        [1] counter
        [2] status string
        [3] textbox value
      */

      const data = result.data;
      let aiReply = "";

      if (Array.isArray(data[0]) && data[0].length > 0) {
        const last = data[0][data[0].length - 1];
        if (Array.isArray(last) && typeof last[1] === "string") {
          aiReply = last[1];
        }
      }

      if (!aiReply) {
        aiReply = "🤖 AI did not return a response.";
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
