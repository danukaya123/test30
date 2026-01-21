const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');

// ------------------ In-memory temporary context ------------------
let userContexts = {}; // { userId: { messages: [...], lastActive: timestamp } }
const CONTEXT_TIMEOUT = 10 * 60 * 1000; // 10 minutes inactivity
const MAX_CONTEXT_MESSAGES = 20;

// ------------------ AI Plugin ------------------
cmd({
    pattern: "ai",
    react: "🤖",
    desc: "Chat with AI (Gemini 2.0 Flash) with temporary memory",
    category: "AI",
    filename: __filename
}, async (danuwa, mek, m, { reply }) => {
    try {
        const userId = m.sender;
        const body = (m.msg?.text || m.msg?.conversation || '').replace(/^\.ai\s*/, '');
        if (!body) return reply('Send me a question after .ai, e.g., `.ai Hello!`');

        const now = Date.now();

        // Initialize user context if not exists
        if (!userContexts[userId]) userContexts[userId] = { messages: [], lastActive: now };

        // Reset context if inactive for too long
        if (now - userContexts[userId].lastActive > CONTEXT_TIMEOUT) {
            userContexts[userId].messages = [];
        }
        userContexts[userId].lastActive = now;

        // Add user message to context
        userContexts[userId].messages.push({ role: "user", content: body });

        // Limit context to last 20 messages
        if (userContexts[userId].messages.length > MAX_CONTEXT_MESSAGES) {
            userContexts[userId].messages.shift();
        }

        // ------------------ Call Gemini API ------------------
        const apiKey = config.GEMINI_API_KEY;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/chat/completions?key=${apiKey}`,
            {
                model: "gemini-2.0-flash",
                messages: [
                    { role: "system", content: "You are Quizontal WhatsApp bot AI. Friendly and helpful." },
                    ...userContexts[userId].messages
                ],
                max_output_tokens: 500
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const aiReply = response.data?.candidates?.[0]?.content?.[0]?.text || "I couldn't understand that.";

        // Send AI reply
        await reply(aiReply);

        // Add AI reply to context
        userContexts[userId].messages.push({ role: "assistant", content: aiReply });

    } catch (err) {
        console.error(err);
        reply('⚠️ AI is not responding right now.');
    }
});
