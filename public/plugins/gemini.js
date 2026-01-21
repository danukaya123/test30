const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');

// ------------------ TEMP MEMORY ------------------
const userContexts = {};
const CONTEXT_TIMEOUT = 10 * 60 * 1000; // 10 min
const MAX_CONTEXT = 20;

// ------------------ SAFE TEXT EXTRACTOR ------------------
function getText(mek, m) {
    return (
        mek.message?.conversation ||
        mek.message?.extendedTextMessage?.text ||
        mek.message?.imageMessage?.caption ||
        mek.message?.videoMessage?.caption ||
        m.msg?.text ||
        ''
    );
}

// ------------------ AI PLUGIN ------------------
cmd({
    pattern: "gemini",
    react: "🤖",
    desc: "AI chat with memory (Gemini)",
    category: "AI",
    filename: __filename
}, async (danuwa, mek, m, { reply }) => {
    try {
        const rawText = getText(mek, m);

        // remove ".ai" from start
        const text = rawText.replace(/^\.ai\s*/i, '').trim();

        if (!text) {
            return reply("❌ Send text like:\n.ai Hello how are you?");
        }

        const userId = m.sender;
        const now = Date.now();

        // init memory
        if (!userContexts[userId]) {
            userContexts[userId] = { messages: [], lastActive: now };
        }

        // auto-reset after inactivity
        if (now - userContexts[userId].lastActive > CONTEXT_TIMEOUT) {
            userContexts[userId].messages = [];
        }
        userContexts[userId].lastActive = now;

        // push user msg
        userContexts[userId].messages.push({
            role: "user",
            content: text
        });

        // limit memory
        if (userContexts[userId].messages.length > MAX_CONTEXT) {
            userContexts[userId].messages.shift();
        }

        // ------------------ GEMINI REQUEST ------------------
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/chat/completions?key=${config.GEMINI_API_KEY}`,
            {
                model: "gemini-2.0-flash",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a WhatsApp AI assistant. Think carefully, reason step by step internally, and respond clearly and helpfully."
                    },
                    ...userContexts[userId].messages
                ],
                generation_config: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_output_tokens: 600
                }
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const aiReply =
            res.data?.candidates?.[0]?.content?.[0]?.text ||
            "⚠️ AI failed to respond.";

        await reply(aiReply);

        // save assistant reply
        userContexts[userId].messages.push({
            role: "assistant",
            content: aiReply
        });

    } catch (err) {
        console.error(err);
        reply("⚠️ AI error. Try again later.");
    }
});
