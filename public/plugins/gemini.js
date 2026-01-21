const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');

// ---------------- MEMORY ----------------
const userContexts = {};
const CONTEXT_TIMEOUT = 10 * 60 * 1000;
const MAX_CONTEXT = 20;

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
    desc: "Gemini AI Chat",
    category: "AI",
    filename: __filename
}, async (danuwa, mek, m, { reply }) => {
    try {
        const raw = getText(mek, m);
        const text = raw.replace(/^\.ai\s*/i, '').trim();

        if (!text) return reply("❌ Use:\n.ai hello");

        const uid = m.sender;
        const now = Date.now();

        if (!userContexts[uid])
            userContexts[uid] = { history: [], last: now };

        if (now - userContexts[uid].last > CONTEXT_TIMEOUT)
            userContexts[uid].history = [];

        userContexts[uid].last = now;

        userContexts[uid].history.push(text);
        if (userContexts[uid].history.length > MAX_CONTEXT)
            userContexts[uid].history.shift();

        // build context
        const prompt = `
You are a helpful WhatsApp AI assistant.
Think carefully and respond clearly.

Conversation:
${userContexts[uid].history.join("\n")}
        `;

        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 600
                }
            }
        );

        const ai =
            res.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "⚠️ No response from AI.";

        reply(ai);
        userContexts[uid].history.push(ai);

    } catch (e) {
        console.error("Gemini error:", e.response?.data || e.message);
        reply("⚠️ Gemini API error.");
    }
});
