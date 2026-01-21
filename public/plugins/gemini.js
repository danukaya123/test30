const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

// 🧠 Per-chat Gemini sessions
const sessions = new Map();

/* ============================
   🤖 GEMINI COMMAND
============================ */
cmd(
  {
    pattern: "gemini",
    react: "🤖",
    desc: "Conversational Gemini AI",
    category: "ai",
    filename: __filename,
  },
  async (conn, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("📎 Use `.gemini <message>`");

      // 🛑 STOP CHAT
      if (q.toLowerCase() === "stop") {
        const s = sessions.get(from);
        if (s) s.active = false;
        return reply("🛑 Gemini chat stopped.");
      }

      // 🧹 RESET CHAT
      if (q.toLowerCase() === "reset") {
        sessions.delete(from);
        return reply("🧹 Gemini memory cleared.");
      }

      await reply("🤖 Thinking...");

      let session = sessions.get(from);

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
        session.active = true; // re-enable
      }

      await runGemini(session, q, conn, from, mek);

    } catch (e) {
      console.error("Gemini command error:", e);
      reply("❌ Gemini error occurred.");
    }
  }
);

/* ============================
   💬 AUTO CHAT HANDLER
   (NO COMMAND NEEDED)
============================ */
cmd(
  {
    // THIS is the key part 👇
    filter: (text, { sender, message }) => {
      const from = message.key.remoteJid;
      const session = sessions.get(from);

      if (!session) return false;        // no session
      if (!session.active) return false; // chat stopped
      if (!text) return false;
      if (text.startsWith(".")) return false; // ignore commands

      return true;
    },
  },
  async (conn, mek, m, { body, from, reply }) => {
    try {
      const session = sessions.get(from);
      if (!session) return;

      await reply("🤖 Thinking...");

      await runGemini(session, body, conn, from, mek);

    } catch (e) {
      console.error("Gemini auto-chat error:", e);
    }
  }
);

/* ============================
   🧠 GEMINI CORE (YOUR LOGIC)
============================ */
async function runGemini(session, q, conn, from, mek) {
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

  session.chatbot.push([q, aiReply]);
  session.counter = session.chatbot.length;

  if (session.chatbot.length > 10) {
    session.chatbot.shift();
    session.counter--;
  }

  await conn.sendMessage(from, { text: aiReply }, { quoted: mek });
}
