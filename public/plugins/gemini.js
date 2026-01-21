const { cmd } = require('../command');
const config = require('../config');
const { Client } = require('@gradio/client');

// ---------------- MEMORY ----------------
const sessions = {};
const TIMEOUT = 10 * 60 * 1000; // 10 minutes
const MAX_HISTORY = 15;

// ---------------- TEXT EXTRACT ----------------
function getText(mek, m) {
    return (
        mek.message?.conversation ||
        mek.message?.extendedTextMessage?.text ||
        mek.message?.imageMessage?.caption ||
        mek.message?.videoMessage?.caption ||
        ''
    );
}

// ---------------- AI PLUGIN ----------------
cmd({
    pattern: "gemini",
    react: "🤖",
    desc: "Free AI Chat (HuggingFace)",
    category: "AI",
    filename: __filename
}, async (danuwa, mek, m, { reply }) => {
    try {
        const raw = getText(mek, m);
        const text = raw.replace(/^\.ai\s*/i, '').trim();

        if (!text) {
            return reply("❌ Use:\n.ai hello");
        }

        const uid = m.sender;
        const now = Date.now();

        // init session
        if (!sessions[uid]) {
            sessions[uid] = {
                chatbot: [],
                counter: 0,
                last: now
            };
        }

        // reset after inactivity
        if (now - sessions[uid].last > TIMEOUT) {
            sessions[uid].chatbot = [];
            sessions[uid].counter = 0;
        }

        sessions[uid].last = now;

        // connect to HF Space
        const client = await Client.connect(
            "yuntian-deng/ChatGPT",
            config.HF_TOKEN ? { hf_token: config.HF_TOKEN } : {}
        );

        const result = await client.predict("/predict", {
            inputs: text,
            top_p: 0.9,
            temperature: 0.7,
            chat_counter: sessions[uid].counter,
            chatbot: sessions[uid].chatbot
        });

        /*
          result.data = [
            chatbot_history,
            new_counter,
            status,
            textbox_value
          ]
        */

        const chatbotHistory = result.data[0];
        const newCounter = result.data[1];

        const lastReply =
            chatbotHistory?.length
                ? chatbotHistory[chatbotHistory.length - 1][1]
                : "⚠️ No response.";

        // update memory
        sessions[uid].chatbot = chatbotHistory.slice(-MAX_HISTORY);
        sessions[uid].counter = newCounter;

        await reply(lastReply);

    } catch (err) {
        console.error("HF AI error:", err);
        reply("⚠️ AI is busy. Try again later.");
    }
});
