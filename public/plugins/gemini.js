const { cmd } = require("../command");
const { Client } = require("@gradio/client");

const HF_SPACE = "yuntian-deng/ChatGPT";

// 🧠 Active Gemini chats (KEYED BY SENDER — IMPORTANT)
const geminiSession = {};

/* ==========================
   🤖 GEMINI COMMAND
========================== */
cmd({
  pattern: "gemini",
  react: "🤖",
  desc: "Conversational Gemini AI",
  category: "ai",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  try {
    if (!q) return reply("📎 Use `.gemini <message>`");

    const text = q.toLowerCase();

    // 🛑 STOP CHAT
    if (text === "stop") {
      if (geminiSession[sender]) geminiSession[sender].active = false;
      return reply("🛑 Gemini chat stopped.");
    }

    // 🧹 RESET CHAT
    if (text === "reset") {
      delete geminiSession[sender];
      return reply("🧹 Gemini memory cleared.");
    }

    await reply("🤖 Thinking...");

    let session = geminiSession[sender];

    // 🔐 Create new session
    if (!session) {
      const client = await Client.connect(HF_SPACE);
      await client.predict("/enable_inputs", {});

      session = {
        client,
        chatbot: [],
        counter: 0,
        active: true,
        timestamp: Date.now()
      };

      geminiSession[sender] = session;
    } else {
      session.active = true;
    }

    await runGemini(session, q, danuwa, from, mek);

  } catch (e) {
    console.error("Gemini command error:", e);
    reply("❌ Gemini error occurred.");
  }
});

/* ==========================
   💬 AUTO CHAT HANDLER
========================== */
cmd({
  filter: (text, { sender }) => {
    const session = geminiSession[sender];

    if (!session) return false;          // no session
    if (!session.active) return false;   // stopped
    if (!text || !text.trim()) return false;
    if (text.startsWith(".")) return false; // ignore commands

    return true;
  }
}, async (danuwa, mek, m, { body, sender, from, reply }) => {
  try {
    const session = geminiSession[sender];
    if (!session) return;

    session.timestamp = Date.now();

    await reply("🤖 Thinking...");

    await runGemini(session, body, danuwa, from, mek);

  } catch (e) {
    console.error("Gemini auto-chat error:", e);
  }
});

/* ==========================
   🧠 GEMINI CORE LOGIC
========================== */
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

  session.chatbot.push([q, aiReply]);
  session.counter = session.chatbot.length;

  if (session.chatbot.length > 10) {
    session.chatbot.shift();
    session.counter--;
  }

  await danuwa.sendMessage(from, { text: aiReply }, { quoted: mek });
}

/* ==========================
   🧹 AUTO CLEANUP (OPTIONAL)
========================== */
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 min
  for (const s in geminiSession) {
    if (now - geminiSession[s].timestamp > timeout) {
      delete geminiSession[s];
    }
  }
}, 60 * 1000);
