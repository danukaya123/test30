const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

cmd(
  {
    pattern: "gemini",
    react: "🤖",
    desc: "Ask AI anything using HuggingFace ChatGPT Space",
    category: "ai",
    filename: __filename,
  },
  async (danuwa, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Send a question after `.gemini` command");

      await reply("🤖 AI is thinking, please wait...");

      // Connect to HF Space
      const client = await Client.connect(HF_SPACE);

      // ✅ CORRECT predict call for JS
      const result = await client.predict("/predict", [
        q,     // inputs
        1,     // top_p
        1,     // temperature
        0,     // chat_counter
        []     // chatbot
      ]);

      /*
        result structure:
        result[0] => chatbot array
        result[1] => counter
        result[2] => status
        result[3] => input textbox
      */

      let aiReply = "";

      if (Array.isArray(result[0]) && result[0].length > 0) {
        const last = result[0][result[0].length - 1];
        if (Array.isArray(last) && typeof last[1] === "string") {
          aiReply = last[1];
        }
      }

      if (!aiReply) aiReply = "🤖 AI did not return a response.";

      await danuwa.sendMessage(
        from,
        { text: aiReply },
        { quoted: mek }
      );

    } catch (err) {
      console.error("HF AI error:", err);
      reply("❌ AI error occurred. Try again later.");
    }
  }
);
