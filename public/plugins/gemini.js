const { Client } = require("@gradio/client");

// Global sessions per user
global.geminiSessions = global.geminiSessions || new Map();

/**
 * Handle Gemini Chat
 * @param {import('@whiskeysockets/baileys').AnyWASocket} conn
 * @param {*} mek
 * @param {string} from - sender JID
 * @param {string} text - user message
 */
async function handleGeminiChat(conn, mek, from, text) {
  // Get existing session or create new
  let session = global.geminiSessions.get(from);

  if (!session) {
    // Connect to Gradio ChatGPT backend
    const client = await Client.connect("yuntian-deng/ChatGPT");

    session = {
      client,
      chatbot: [
        [
          "SYSTEM",
          "You are a professional, friendly AI assistant. Speak clearly and naturally. " +
          "Remember user-provided details only within this chat. " +
          "Avoid robotic or confusing responses."
        ]
      ],
      counter: 1,
    };

    global.geminiSessions.set(from, session);

    await conn.sendMessage(from, { text: "🤖 Gemini chat mode activated! You can start chatting now." }, { quoted: mek });
  }

  // Show typing
  await conn.sendPresenceUpdate('composing', from);

  try {
    // Send message to AI
    const result = await session.client.predict("/predict", {
      inputs: text,
      top_p: 1,
      temperature: 0.7,
      chat_counter: session.counter,
      chatbot: session.chatbot,
    });

    let replyText = "🤖 AI did not return a response.";

    // ✅ Fixed parsing logic
    if (Array.isArray(result.data?.[0])) {
      const chatbotData = result.data[0];
      const lastMessage = chatbotData[chatbotData.length - 1];

      if (Array.isArray(lastMessage)) {
        replyText = lastMessage[1] || replyText;
      } else if (typeof lastMessage === "string") {
        replyText = lastMessage;
      }
    } else if (typeof result.data?.[0] === "string") {
      replyText = result.data[0];
    }

    // Save memory
    session.chatbot.push([text, replyText]);
    session.counter += 1;

    // Keep only last 12 messages in memory
    if (session.chatbot.length > 12) {
      session.chatbot.splice(1, 1);
      session.counter = session.chatbot.length;
    }

    // Send reply
    await conn.sendMessage(from, { text: replyText }, { quoted: mek });

  } catch (e) {
    console.error("❌ Gemini AI error:", e);
    await conn.sendMessage(from, { text: "❌ AI encountered an error. Please try again later." }, { quoted: mek });
  }

  // Done typing
  await conn.sendPresenceUpdate('available', from);
}

module.exports = { handleGeminiChat };
