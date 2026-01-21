const { cmd } = require("../command");
const { sendButtons } = require("gifted-btns");
const config = require("../config");


const triviaQuestions = [
  {
    number: 1,
    question: "1. ශ්‍රී ලංකාවේ අගනගරය කුමක්ද?",
    options: ["1. මහනුවර (Kandy)", "2. ගාල්ල (Galle)", "3. කොළඹ (Colombo)", "4. ශ්‍රී ජයවර්ධනපුර කෝට්ටේ (Sri Jayawardenepura Kotte)"],
    answer: 4
  },
  {
    number: 2,
    question: "2. ලෝකයේ දිගම ගඟ කුමක්ද?",
    options: ["1. අමසෝන් (Amazon)", "2. නයිල් (Nile)", "3. ගංගා (Ganga)", "4. යංග්සි (Yangtze)"],
    answer: 2
  },
  {
    number: 3,
    question: "3. ශ්‍රී ලංකාවේ වඩාත් ජනප්‍රිය ක්‍රීඩාව කුමක්ද?",
    options: ["1. ක්‍රිකට් (Cricket)", "2. වොලිබෝල් (Volleyball)", "3. පාපන්දු (Football)", "4. රග්බි (Rugby)"],
    answer: 1
  },
  {
    number: 4,
    question: "4. ලෝකයේ උසම කඳුවැටිය කුමක්ද?",
    options: ["1. එවරස්ට් (Everest)", "2. කේටූ (K2)", "3. ආනපූර්ණා (Annapurna)", "4. කිලීමංජාරෝ (Kilimanjaro)"],
    answer: 1
  },
  {
    number: 5,
    question: "5. අපට හුස්ම ගන්න අවශ්‍ය වායුව කුමක්ද?",
    options: ["1. නයිට්‍රජන් (Nitrogen)", "2. ඔක්සිජන් (Oxygen)", "3. කාබන් ඩයොක්සයිඩ් (Carbon Dioxide)", "4. ඔසෝන් (Ozone)"],
    answer: 2
  },
  {
    number: 6,
    question: "6. ශ්‍රී ලංකාවේ බස්නාහිර පළාතේ පිහිටි නගරයක් කුමක්ද?",
    options: ["1. ගාල්ල (Galle)", "2. අනුරාධපුරය (Anuradhapura)", "3. නුගේගොඩ (Nugegoda)", "4. කුරුණෑගල (Kurunegala)"],
    answer: 3
  },
  {
    number: 7,
    question: "7. සඳට පළමු වරට ගිය මිනිසා කවුද?",
    options: ["1. නීල් ආම්ස්ට්‍රොංග් (Neil Armstrong)", "2. යුරි ගගරින් (Yuri Gagarin)", "3. බස් අල්ඩ්‍රින් (Buzz Aldrin)", "4. ජෝන් ග්ලෙන් (John Glenn)"],
    answer: 1
  },
  {
    number: 8,
    question: "8. ශ්‍රී ලංකාවේ පළමු විධායක ජනාධිපතිවරයා කවුද?",
    options: ["1. ආර්. ප්‍රේමදාස (R. Premadasa)", "2. ජේ. ආර්. ජයවර්ධන (J.R. Jayewardene)", "3. සිරිමාවෝ බණ්ඩාරනායක (Sirimavo Bandaranaike)", "4. චන්ද්‍රිකා කුමාරතුංග (Chandrika Kumaratunga)"],
    answer: 2
  },
  {
    number: 9,
    question: "9. ලෝකයේ ජනගහණය වැඩියෙන්ම ඇති රට කුමක්ද?",
    options: ["1. ඇමරිකාව (USA)", "2. ඉන්දියාව (India)", "3. චීනය (China)", "4. ඉන්දුනීසියාව (Indonesia)"],
    answer: 2
  },
  {
    number: 10,
    question: "10. ලෝකයේ ප්‍රධාන සීනි නිෂ්පාදක රට කුමක්ද?",
    options: ["1. කියුබාව (Cuba)", "2. බ්‍රසීලය (Brazil)", "3. ඉන්දියාව (India)", "4. තායිලන්තය (Thailand)"],
    answer: 2
  },
  {
    number: 11,
    question: "11. ලෝකයේ භාවිතා වන වඩාත් ජනප්‍රිය අන්තර්ජාල සෙවුම් යන්ත්‍රය කුමක්ද?",
    options: ["1. බිංග් (Bing)", "2. යාහු (Yahoo)", "3. ගූගල් (Google)", "4. බයිඩු (Baidu)"],
    answer: 3
  },
  {
    number: 12,
    question: "12. ශ්‍රී ලංකාවේ ජනපද 9න් එකක් වන්නේ කුමක්ද?",
    options: ["1. මධ්‍යම පළාත (Central Province)", "2. දිවුල්පිටිය (Divulapitiya)", "3. කඩවත (Kadawatha)", "4. නාවලපිටිය (Nawalapitiya)"],
    answer: 1
  },
  {
    number: 13,
    question: "13. වෙනස්වීම් ඇති කාලගුණය සෙවීම සඳහා භාවිතා කරන උපාංගය කුමක්ද?",
    options: ["1. තාපමාන මීටරය (Thermometer)", "2. බාරෝමීටරය (Barometer)", "3. කම්පා මීටරය (Seismometer)", "4. සෞර පැනලය (Solar panel)"],
    answer: 2
  },
  {
    number: 14,
    question: "14. ලෝකයේ දිගුතම භූමි සීමාව යුතුව ඇති රට කුමක්ද?",
    options: ["1. චීනය (China)", "2. රුසියාව (Russia)", "3. ඇමරිකාව (USA)", "4. කැනඩාව (Canada)"],
    answer: 2
  },
  {
    number: 15,
    question: "15. ලෝකයේ වඩාත් ජනප්‍රිය සමාජ මාධ්‍ය ජාලය කුමක්ද?",
    options: ["1. ට්විටර් (Twitter)", "2. ෆේස්බුක් (Facebook)", "3. ඉන්ස්ටග්‍රෑම් (Instagram)", "4. ටික්ටොක් (TikTok)"],
    answer: 2
  },
  {
    number: 16,
    question: "16. ශ්‍රී ලංකාවේ නිල භාෂා දෙක කුමක්ද?",
    options: ["1. සිංහල සහ ඉංග්‍රීසි (Sinhala & English)", "2. සිංහල සහ දමිළ (Sinhala & Tamil)", "3. දමිළ සහ ඉංග්‍රීසි (Tamil & English)", "4. සිංහල සහ හින්දි (Sinhala & Hindi)"],
    answer: 2
  },
  {
    number: 17,
    question: "17. ලෝකයේ පළමු මිනිසා ගිය ග්‍රහලෝකය කුමක්ද?",
    options: ["1. මාර්ස් (Mars)", "2. ව්‍යසන කලාපය (Asteroid belt)", "3. සඳ (Moon)", "4. ජුපිටර් (Jupiter)"],
    answer: 3
  },
  {
    number: 18,
    question: "18. කුරුල්ලන්ට පියාඹා යා හැකි වන්නේ මොනවද නිසාද?",
    options: ["1. ඔවුන්ට පෙරළිය හැකි බැවින් (Because they can turn)", "2. ඔවුන්ට පියාපත් ඇති බැවින් (Because they have wings)", "3. ඔවුන්ට ඉසිඹු ඇති බැවින් (Because they have beaks)", "4. ඔවුන්ට කොකු ඇති බැවින් (Because they have tails)"],
    answer: 2
  },
  {
    number: 19,
    question: "19. ශ්‍රී ලංකාවේ සමුද්‍රසීමාවේ වටා ඇති මුහුද කුමක්ද?",
    options: ["1. අරාබි මුහුද (Arabian Sea)", "2. බෙරින්ග් මුහුද (Bering Sea)", "3. ඉන්දීය සාගරය (Indian Ocean)", "4. ලාබ්‍රඩෝ මුහුද (Labrador Sea)"],
    answer: 3
  },
  {
    number: 20,
    question: "20. ලෝකයේ පළමු පරිගණකය ලෙස සැලකෙන්නේ කුමක්ද?",
    options: ["1. ENIAC", "2. IBM", "3. Macintosh", "4. Dell"],
    answer: 1
  },
  // Repeated questions (21–30)
  {
    number: 21,
    question: "21. ශ්‍රී ලංකාවේ අගනගරය කුමක්ද?",
    options: ["1. මහනුවර (Kandy)", "2. ගාල්ල (Galle)", "3. කොළඹ (Colombo)", "4. ශ්‍රී ජයවර්ධනපුර කෝට්ටේ (Sri Jayawardenepura Kotte)"],
    answer: 4
  },
  {
    number: 22,
    question: "22. ලෝකයේ දිගම ගඟ කුමක්ද?",
    options: ["1. අමසෝන් (Amazon)", "2. නයිල් (Nile)", "3. ගංගා (Ganga)", "4. යංග්සි (Yangtze)"],
    answer: 2
  },
  {
    number: 23,
    question: "23. ශ්‍රී ලංකාවේ වඩාත් ජනප්‍රිය ක්‍රීඩාව කුමක්ද?",
    options: ["1. ක්‍රිකට් (Cricket)", "2. වොලිබෝල් (Volleyball)", "3. පාපන්දු (Football)", "4. රග්බි (Rugby)"],
    answer: 1
  },
  {
    number: 24,
    question: "24. ලෝකයේ උසම කඳුවැටිය කුමක්ද?",
    options: ["1. එවරස්ට් (Everest)", "2. කේටූ (K2)", "3. ආනපූර්ණා (Annapurna)", "4. කිලීමංජාරෝ (Kilimanjaro)"],
    answer: 1
  },
  {
    number: 25,
    question: "25. අපට හුස්ම ගන්න අවශ්‍ය වායුව කුමක්ද?",
    options: ["1. නයිට්‍රජන් (Nitrogen)", "2. ඔක්සිජන් (Oxygen)", "3. කාබන් ඩයොක්සයිඩ් (Carbon Dioxide)", "4. ඔසෝන් (Ozone)"],
    answer: 2
  },
  {
    number: 26,
    question: "26. ශ්‍රී ලංකාවේ බස්නාහිර පළාතේ පිහිටි නගරයක් කුමක්ද?",
    options: ["1. ගාල්ල (Galle)", "2. අනුරාධපුරය (Anuradhapura)", "3. නුගේගොඩ (Nugegoda)", "4. කුරුණෑගල (Kurunegala)"],
    answer: 3
  },
  {
    number: 27,
    question: "27. සඳට පළමු වරට ගිය මිනිසා කවුද?",
    options: ["1. නීල් ආම්ස්ට්‍රොංග් (Neil Armstrong)", "2. යුරි ගගරින් (Yuri Gagarin)", "3. බස් අල්ඩ්‍රින් (Buzz Aldrin)", "4. ජෝන් ග්ලෙන් (John Glenn)"],
    answer: 1
  },
  {
    number: 28,
    question: "28. ශ්‍රී ලංකාවේ පළමු විධායක ජනාධිපතිවරයා කවුද?",
    options: ["1. ආර්. ප්‍රේමදාස (R. Premadasa)", "2. ජේ. ආර්. ජයවර්ධන (J.R. Jayewardene)", "3. සිරිමාවෝ බණ්ඩාරනායක (Sirimavo Bandaranaike)", "4. චන්ද්‍රිකා කුමාරතුංග (Chandrika Kumaratunga)"],
    answer: 2
  },
  {
    number: 29,
    question: "29. ලෝකයේ ජනගහණය වැඩියෙන්ම ඇති රට කුමක්ද?",
    options: ["1. ඇමරිකාව (USA)", "2. ඉන්දියාව (India)", "3. චීනය (China)", "4. ඉන්දුනීසියාව (Indonesia)"],
    answer: 2
  },
  {
    number: 30,
    question: "30. ලෝකයේ ප්‍රධාන සීනි නිෂ්පාදක රට කුමක්ද?",
    options: ["1. කියුබාව (Cuba)", "2. බ්‍රසීලය (Brazil)", "3. ඉන්දියාව (India)", "4. තායිලන්තය (Thailand)"],
    answer: 2
  }
];



const userScores = {};


async function askQuestion(robin, mek, m, from, sender) {
  const { currentQuestionIndex } = userScores[sender];

  if (currentQuestionIndex >= triviaQuestions.length) {
    const score = userScores[sender].score;

    await robin.sendMessage(
      from,
      {
        image: { url: "https://cdn-icons-png.flaticon.com/512/992/992700.png" },
        caption: `
🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘 🧠
════════════════════════      

🎯 *Your Final Score:* ${score} / ${triviaQuestions.length}

🎉 *Thanks for playing!*`,
      },
      { quoted: mek }
    );

    delete userScores[sender];
    return;
  }

  const question = triviaQuestions[currentQuestionIndex];

  const questionText = `
🎓 𝐓𝐑𝐈𝐕𝐈𝐀 𝐂𝐇𝐀𝐋𝐋𝐄𝐍𝐆𝐄 🎓
════════════════════════     

📜 *Question:* ${question.question}
────────────────────────
🔢 *Answers:*
${question.options.join("\n")}
`;

  // 🔘 BUTTON MODE
  if (config.BUTTON === true) {
    const buttons = question.options.map((opt, i) => ({
      id: `.trivia_ans_${i + 1}`,
      text: opt.replace(/^\d+\.\s*/, "")
    }));

    await sendButtons(
      robin,
      from,
      {
        text: questionText + "\n🎯 *Tap the correct answer below*",
        buttons
      },
      { quoted: mek }
    );

  } else {
    // 📝 TEXT MODE
    await robin.sendMessage(
      from,
      {
        text: questionText + `
────────────────────────
🎯 *Reply with the number (1–4)*`
      },
      { quoted: mek }
    );
  }
}



 // To store users' scores




cmd(
  {
    pattern: "trivia",
    react: "🧠",
    desc: "Start a trivia quiz",
    category: "fun",
    filename: __filename,
  },
  async (robin, mek, m, { from, sender }) => {
    try {
      // Ask if the user is ready
      await robin.sendMessage(
        from,
        {
          image: {
            url: "https://github.com/DANUWA-MD/DANUWA-MD/blob/main/images/trivia.png?raw=true",
          },
          caption: `
           🌟 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 🌟    
════════════════════════      
🔮  Ｄ  Ａ  Ｎ  Ｕ  Ｗ  Ａ －  Ｍ  Ｄ  🔮  
            🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗤𝗨𝗜𝗭 🧠
════════════════════════  
📋 Total Questions: *30*

👋 Hello! Are you ready to test your knowledge?

🧠 *Reply with "start" to begin the trivia quiz!*`,
        },
        { quoted: mek }
      );

      // Store user in "waiting to start" state
      userScores[sender] = {
        awaitingStart: true,
      };

    } catch (e) {
      console.error(e);
      reply("❌ *Error:* " + e.message);
    }
  }
);



cmd(
  {
    filter: (text, { sender }) => {
      return userScores[sender]?.awaitingStart && text.trim().toLowerCase() === "start";
    },
  },
  async (robin, mek, m, { from, sender, reply }) => {
    userScores[sender] = {
      score: 0,
      currentQuestionIndex: 0,
    };

    await reply("🎮 *Starting your trivia game...*");
    await askQuestion(robin, mek, m, from, sender);
  }
);


cmd({
    filter: (text, { sender }) => {
      return userScores[sender] && /^[1-4]$/.test(text.trim());
    },
  },
  async (robin, mek, m, { from, body, sender, reply }) => {
    const userAnswer = parseInt(body.trim());
    const { currentQuestionIndex } = userScores[sender];
    const question = triviaQuestions[currentQuestionIndex];
    
    // Check if the answer is correct
    const isCorrect = userAnswer === question.answer;
    
    // Update score
    if (isCorrect) {
      userScores[sender].score += 1;
    }
    
    // Move to the next question
    userScores[sender].currentQuestionIndex += 1;

    // If answer is correct, ask the next question; else, stop the quiz
    if (isCorrect) {
      await reply(`
          🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗥𝗘𝗦𝗨𝗟𝗧 🧠
════════════════════════  

🎯 *Your Answer:* Option ${userAnswer} - ✅ Correct!

🧠 *Well done! Moving to the next question...*
`);
      await askQuestion(robin, mek, m, from, sender);
    } else {
      await reply(`
          🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗥𝗘𝗦𝗨𝗟𝗧 🧠
════════════════════════  

🎯 *Your Answer:* Option ${userAnswer} - ❌ Incorrect!

🎉 *Thanks for playing!*

🎯 *Your Final Score:* ${userScores[sender].score} / ${triviaQuestions.length}
`);
      delete userScores[sender]; // Clear the user's score data after quiz completion
    }
  }
);

cmd(
  {
    filter: (text, { sender }) => {
      return (
        userScores[sender] &&
        text.startsWith(".trivia_ans_")
      );
    },
  },
  async (robin, mek, m, { from, body, sender, reply }) => {
    const userAnswer = parseInt(body.split("_").pop());
    const { currentQuestionIndex } = userScores[sender];
    const question = triviaQuestions[currentQuestionIndex];

    const isCorrect = userAnswer === question.answer;

    if (isCorrect) userScores[sender].score += 1;
    userScores[sender].currentQuestionIndex += 1;

    if (isCorrect) {
      await reply(`
🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗥𝗘𝗦𝗨𝗟𝗧 🧠
════════════════════════  

🎯 *Your Answer:* Option ${userAnswer} - ✅ Correct!

➡️ *Next question loading...*`);
      await askQuestion(robin, mek, m, from, sender);
    } else {
      await reply(`
🧠 𝗧𝗥𝗜𝗩𝗜𝗔 𝗥𝗘𝗦𝗨𝗟𝗧 🧠
════════════════════════  

🎯 *Your Answer:* Option ${userAnswer} - ❌ Incorrect!

🎯 *Final Score:* ${userScores[sender].score} / ${triviaQuestions.length}
`);
      delete userScores[sender];
    }
  }
);

