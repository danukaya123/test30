const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

// 🧠 Per-chat session memory
const sessions = new Map();

/* ================================
   🔥 GEMINI COMMAND (START / CONTROL)
================================ */
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

      // 🧹 RESET MEMORY
      if (q.toLowerCase() === "reset") {
        sessions.delete(from);
        return reply("🧹 Conversation memory cleared.");
      }

      // 🛑 STOP CHAT MODE
      if (q.toLowerCase() === "stop") {
        const s = sessions.get(from);
        if (s) s.active = false;
        return reply("🛑 Gemini chat stopped.");
      }

      await reply("🤖 Thinking...");

      let session = sessions.get(from);

      // 🔐 Create session if not exists
      if (!session) {
        const client = await Client.connect(HF_SPACE);
        await client.predict("/enable_inputs", {});

        session = {
          client,
          chatbot: [],
          counter: 0,
          active: true, // 👈 CHAT MODE ON
        };

        sessions.set(from, session);
      } else {
        session.active = true; // 👈 re-enable chat mode
      }

      await runGemini(session, q, danuwa, from, mek);

    } catch (err) {
      console.error("HF AI error:", err);
      reply("❌ AI error occurred.");
    }
  }
);

/* ================================
   🤖 AUTO CHAT (NO COMMAND NEEDED)
================================ */
cmd(
  {
    on: "text",
  },
  async (danuwa, mek, m, { from, body }) => {
    try {
      const session = sessions.get(from);

      // ❌ No active Gemini chat
      if (!session || !session.active) return;

      // ❌ Ignore commands
      if (body.startsWith(".")) return;

      await danuwa.sendMessage(
        from,
        { text: "🤖 Thinking..." },
        { quoted: mek }
      );

      await runGemini(session, body, danuwa, from, mek);

    } catch (err) {
      console.error("Auto Gemini error:", err);
    }
  }
);

/* ================================
   🧠 GEMINI CORE LOGIC (YOUR LOGIC)
================================ */
async function runGemini(session, q, danuwa, from, mek) {
  const result = await session.client.predict("/predict", {
    inputs: q,
    top_p: 1,
    temperature: 1,
    chat_counter: session.counter,
    chatbot: session.chatbot,
  });

  const data = result.data;
  let aiReply = "🤖 I couldn’t generate a reply.";

  if (Array.isArray(data[0]) && data[0].length > 0) {
    const last = data[0][data[0].length - 1];
    if (Array.isArray(last) && typeof last[1] === "string") {
      aiReply = last[1];
    }
  }

  // 🧠 Update memory
  session.chatbot.push([q, aiReply]);
  session.counter = session.chatbot.length;

  // 🧹 Limit history
  if (session.chatbot.length > 10) {
    session.chatbot.shift();
    session.counter--;
  }

  await danuwa.sendMessage(
    from,
    { text: aiReply },
    { quoted: mek }
  );
}
