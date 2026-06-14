function runPipeline(messages, nextQuestion) {
  const allMsgs = messages;

  const STOP_WORDS = new Set([
    "i","me","my","myself","we","our","ours","ourselves","you","your","yours","yourself",
    "he","him","his","himself","she","her","hers","herself","it","its","itself","they",
    "them","their","theirs","themselves","what","which","who","whom","this","that","these",
    "those","am","is","are","was","were","be","been","being","have","has","had","having",
    "do","does","did","doing","a","an","the","and","but","if","or","because","as","until",
    "while","of","at","by","for","with","about","against","between","into","through",
    "during","before","after","above","below","to","from","up","down","in","out","on",
    "off","over","under","again","further","then","once","here","there","when","where",
    "why","how","all","both","each","few","more","most","other","some","such","no","nor",
    "not","only","own","same","so","than","too","very","s","t","can","will","just","don",
    "should","now","d","ll","m","o","re","ve","y","ain","aren","couldn","didn","doesn",
    "hadn","hasn","haven","isn","ma","mightn","mustn","needn","shan","shouldn","wasn",
    "weren","won","wouldn","also","however","therefore","thus","hence","although","though",
    "let","make","get","use","need","want","like","know","think","look","see","go","come",
    "take","give","sure","way","thing","things","something","anything","nothing","everything",
    "well","really","actually","basically","literally","simply","just","even","still","yet",
    "already","first","last","next","back","right","left","new","good","great","different",
    "same","many","much","little","own","old","high","large","small","long","big","much"
  ]);

  function tokenize(text) {
    return text.toLowerCase().match(/\b[a-z][a-z0-9]{1,}\b/g) || [];
  }

  function computeTfIdf(messages) {
    const docTokens = messages.map(m => tokenize(m.content || ""));
    const N = docTokens.length;
    const df = {};
    docTokens.forEach(tokens => {
      const seen = new Set(tokens);
      seen.forEach(t => { if (!STOP_WORDS.has(t)) df[t] = (df[t] || 0) + 1; });
    });
    const scores = {};
    docTokens.forEach((tokens, docIdx) => {
      const tf = {};
      tokens.forEach(t => { if (!STOP_WORDS.has(t)) tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(t => {
        const tfidf = (tf[t] / tokens.length) * Math.log((N + 1) / (df[t] + 1));
        const recency = (docIdx + 1) / N;
        scores[t] = (scores[t] || 0) + tfidf * (0.5 + 0.5 * recency);
      });
    });
    return scores;
  }

  function rake(text) {
    const sentences = text.split(/[.!?\n;,():"\-\[\]]+/);
    const phraseScores = {};
    const wordFreq = {};
    const wordDegree = {};

    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().match(/\b[a-z][a-z0-9]{1,}\b/g) || [];
      let phrase = [];
      words.forEach(word => {
        if (STOP_WORDS.has(word) || word.length <= 1) {
          if (phrase.length > 0) {
            phrase.forEach(w => {
              wordFreq[w] = (wordFreq[w] || 0) + 1;
              wordDegree[w] = (wordDegree[w] || 0) + phrase.length - 1;
            });
            const key = phrase.join(" ");
            phraseScores[key] = phrase;
          }
          phrase = [];
        } else {
          phrase.push(word);
        }
      });
      if (phrase.length > 0) {
        phrase.forEach(w => {
          wordFreq[w] = (wordFreq[w] || 0) + 1;
          wordDegree[w] = (wordDegree[w] || 0) + phrase.length - 1;
        });
        phraseScores[phrase.join(" ")] = phrase;
      }
    });

    const wordScore = {};
    Object.keys(wordFreq).forEach(w => {
      wordScore[w] = (wordDegree[w] + wordFreq[w]) / wordFreq[w];
    });

    return Object.keys(phraseScores).map(phrase => ({
      phrase,
      score: phraseScores[phrase].reduce((sum, w) => sum + (wordScore[w] || 0), 0)
    })).sort((a, b) => b.score - a.score);
  }

  function extractNamedTokens(text) {
    const named = [];
    const patterns = [
      /`([^`\n]{1,60})`/g,
      /\b([A-Z][a-z]{1,}(?:[A-Z][a-z0-9]{1,})+)\b/g,
      /\b([A-Z]{2,}[a-z0-9]*)\b/g,
      /\b([a-z]{2,}(?:_[a-z0-9]{2,}){1,})\b/g,
      /\b([a-zA-Z0-9][a-zA-Z0-9_\-]{1,}\.(?:js|ts|py|go|rs|java|html|css|json|md|sh|rb|cpp|c|h|env|yml|yaml|toml))\b/g
    ];
    patterns.forEach(re => {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) named.push(m[1].trim());
    });
    return named;
  }

  const fullText = allMsgs.map(m => m.content || "").join("\n");
  const tfIdfScores = computeTfIdf(allMsgs);
  const rakeResults = rake(fullText);
  const namedTokens = extractNamedTokens(fullText);

  const entityScore = {};
  Object.keys(tfIdfScores).forEach(t => {
    if (t.length >= 3 && !STOP_WORDS.has(t)) entityScore[t] = (entityScore[t] || 0) + tfIdfScores[t];
  });
  rakeResults.slice(0, 40).forEach(({ phrase, score }) => {
    phrase.split(" ").forEach(w => {
      if (w.length >= 3 && !STOP_WORDS.has(w)) entityScore[w] = (entityScore[w] || 0) + score * 0.3;
    });
    if (phrase.includes(" ")) entityScore[phrase] = (entityScore[phrase] || 0) + score;
  });
  namedTokens.forEach(t => {
    const key = t.toLowerCase();
    entityScore[key] = (entityScore[key] || 0) + 4.0;
    entityScore[t] = (entityScore[t] || 0) + 4.0;
  });

  const topEntities = [];
  const sortedKeys = Object.keys(entityScore)
    .filter(k => k.length >= 2 && !STOP_WORDS.has(k.toLowerCase()))
    .sort((a, b) => entityScore[b] - entityScore[a]);

  sortedKeys.forEach(k => {
    const lowerK = k.toLowerCase();
    const existingIndex = topEntities.findIndex(e => e.toLowerCase() === lowerK);
    if (existingIndex !== -1) {
      const hasUpperK = /[A-Z]/.test(k);
      const hasUpperExisting = /[A-Z]/.test(topEntities[existingIndex]);
      if (hasUpperK && !hasUpperExisting) {
        topEntities[existingIndex] = k;
      }
    } else {
      topEntities.push(k);
    }
  });

  const finalTopEntities = [];
  topEntities.forEach(e => {
    const isSingleWord = !e.includes(" ");
    if (isSingleWord) {
      const isContained = topEntities.some(other => other.includes(" ") && other.toLowerCase().includes(e.toLowerCase()));
      if (isContained) return;
    }
    finalTopEntities.push(e);
  });
  const finalTopEntitiesSliced = finalTopEntities.slice(0, 15);

  const trainData = [
    { text: "always use responsive design", label: 1 },
    { text: "never write inline styles", label: 1 },
    { text: "make sure the button is visible", label: 1 },
    { text: "ensure the output is valid JSON", label: 1 },
    { text: "avoid using external libraries", label: 1 },
    { text: "prefer clean code principles", label: 1 },
    { text: "keep it under 200 words", label: 1 },
    { text: "do not use global variables", label: 1 },
    { text: "restrict input to numbers only", label: 1 },
    { text: "must be compatible with Safari", label: 1 },
    { text: "should avoid complex nesting", label: 1 },
    { text: "stick to vanilla javascript", label: 1 },
    { text: "use only HSL tailoring colors", label: 1 },
    { text: "be careful with database queries", label: 1 },
    { text: "refrain from adding comments", label: 1 },
    { text: "do not make weekend deployments", label: 1 },
    { text: "always respect the user requirements", label: 1 },
    { text: "keep styles consistent across elements", label: 1 },
    { text: "ensure all pages are responsive", label: 1 },
    { text: "avoid generic names or placeholders", label: 1 },
    { text: "thank you for the explanation", label: 0 },
    { text: "that sounds like a great plan", label: 0 },
    { text: "can you help me with this?", label: 0 },
    { text: "I am planning a trip to Tokyo", label: 0 },
    { text: "here is the code I wrote", label: 0 },
    { text: "what is the fastest car?", label: 0 },
    { text: "the engine roars and the tires scream", label: 0 },
    { text: "let's start the guide now", label: 0 },
    { text: "I tried this and it worked well", label: 0 },
    { text: "why did this happen?", label: 0 },
    { text: "tell me about your day", label: 0 },
    { text: "I don't know if that's correct", label: 0 },
    { text: "can we change the tone?", label: 0 },
    { text: "here is the revised version", label: 0 },
    { text: "got it, rules saved", label: 0 },
    { text: "the weather is very nice today", label: 0 },
    { text: "please write a poem about the sea", label: 0 },
    { text: "explain the metaphor of the ship", label: 0 },
    { text: "that is exactly what I wanted", label: 0 },
    { text: "what should I do next?", label: 0 }
  ];

  const classCounts = { 0: 0, 1: 0 };
  const docCounts = { 0: {}, 1: {} };
  const vocab = new Set();

  trainData.forEach(item => {
    const label = item.label;
    classCounts[label]++;
    const tokens = new Set(tokenize(item.text));
    tokens.forEach(token => {
      docCounts[label][token] = (docCounts[label][token] || 0) + 1;
      vocab.add(token);
    });
  });

  const classifySentence = (text) => {
    const tokens = tokenize(text);
    const validTokens = tokens.filter(t => vocab.has(t));
    if (validTokens.length === 0) return 0;
    let probPositive = Math.log(classCounts[1] / trainData.length);
    let probNegative = Math.log(classCounts[0] / trainData.length);
    validTokens.forEach(token => {
      const posDocCount = docCounts[1][token] || 0;
      const negDocCount = docCounts[0][token] || 0;
      const pPos = (posDocCount + 0.1) / (classCounts[1] + 0.2);
      const pNeg = (negDocCount + 0.1) / (classCounts[0] + 0.2);
      probPositive += Math.log(pPos);
      probNegative += Math.log(pNeg);
    });
    return probPositive > probNegative ? 1 : 0;
  };

  const userText = allMsgs.filter(m => (m.role || "").toLowerCase() === "user").map(m => m.content || "").join("\n");
  const sentences = userText.split(/[.!?\n]+/);
  const constraints = [];
  sentences.forEach(s => {
    const t = s.trim();
    if (t.length < 8 || t.length > 300) return;
    if (classifySentence(t) === 1) {
      const isDuplicate = constraints.some(c => {
        const cLower = c.toLowerCase();
        const tLower = t.toLowerCase();
        return cLower.includes(tLower) || tLower.includes(cLower) || cLower.slice(0, 30) === tLower.slice(0, 30);
      });
      if (!isDuplicate) {
        constraints.push(t);
      }
    }
  });

  const codeBlocks = [];
  const codeRe = /```([\s\S]*?)```/g;
  let cm;
  while ((cm = codeRe.exec(fullText)) !== null) codeBlocks.push(cm[0]);
  const lastCode = codeBlocks.length > 0 ? codeBlocks[codeBlocks.length - 1] : "";

  const firstUserMsg = allMsgs.find(m => (m.role || "").toLowerCase() === "user");
  const topic = firstUserMsg ? firstUserMsg.content.trim().replace(/\s+/g, " ").slice(0, 200) + (firstUserMsg.content.length > 200 ? "..." : "") : "General conversation";

  const shouldPreserveFormat = (text) => {
    if (!text) return false;
    const clean = text.trim();
    if (clean.includes("```")) return true;
    if (clean.includes("|") && clean.split("\n").some(line => line.trim().startsWith("|"))) return true;

    const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return false;

    const listLines = lines.filter(l => /^[*\-+\d]+[.)\s]/.test(l));
    if (listLines.length / lines.length > 0.25) return true;

    const colonLines = lines.filter(l => l.includes(":") && l.indexOf(":") > 1 && l.indexOf(":") < l.length - 2);
    if (colonLines.length / lines.length > 0.5) return true;

    const capitalizedLines = lines.filter(l => l.length > 0 && l[0] === l[0].toUpperCase() && /[A-Z]/.test(l[0]));
    if (capitalizedLines.length / lines.length >= 0.7 && lines.length >= 3) return true;

    const avgLineLen = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
    if (avgLineLen < 120 && lines.length >= 2) return true;

    return false;
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return "";
    const blocks = text.split("\n\n");
    const processedBlocks = blocks.map(block => {
      const cleanBlock = block.trim();
      if (!cleanBlock) return "";
      if (shouldPreserveFormat(cleanBlock)) {
        return cleanBlock;
      }
      if (cleanBlock.length <= maxLength) {
        return cleanBlock;
      }
      return cleanBlock.slice(0, maxLength) + " ... [truncated]";
    });
    return processedBlocks.filter(Boolean).join("\n\n");
  };

  let recentExchangeText = "";
  if (allMsgs.length > 0) {
    const firstUserIndex = allMsgs.findIndex(m => (m.role || "").toLowerCase() === "user");
    const firstMsgs = [];
    if (firstUserIndex !== -1) {
      for (let i = firstUserIndex; i < Math.min(allMsgs.length, firstUserIndex + 6); i++) {
        firstMsgs.push(allMsgs[i]);
      }
    }

    const lastMsgs = allMsgs.slice(-6);
    const printed = new Set();
    
    firstMsgs.forEach(m => {
      const isUser = (m.role || "").toLowerCase() === "user";
      const content = isUser ? (m.content || "") : truncateText(m.content || "", 1200);
      recentExchangeText += `${isUser ? "User" : "Assistant"}: ${content}\n`;
      printed.add(m);
    });

    const gap = allMsgs.filter(m => !printed.has(m) && !lastMsgs.includes(m));
    if (gap.length > 0) {
      recentExchangeText += "... [some messages omitted for brevity] ...\n";
    }

    lastMsgs.forEach(m => {
      if (!printed.has(m)) {
        const isUser = (m.role || "").toLowerCase() === "user";
        const content = isUser ? (m.content || "") : truncateText(m.content || "", 300);
        recentExchangeText += `${isUser ? "User" : "Assistant"}: ${content}\n`;
      }
    });
  }

  return `[CONTEXT FROM PREVIOUS SESSION]
Topic: ${topic}
Key entities: ${finalTopEntitiesSliced.join(", ")}
Constraints:
${constraints.map(c => `- ${c}`).join("\n")}
Most recent code:
${lastCode}

Recent exchange:
${recentExchangeText.trim()}

[USER'S NEXT QUESTION]
${nextQuestion}`;
}
