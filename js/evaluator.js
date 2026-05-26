// Lake House Card Quality Evaluator (LCQE)
// Static heuristics + fast bot-vs-bot simulation to balance fill-in-the-blank cards.

export function runEvaluation(prompts, responses, roundsCount = 1000) {
  // 1. Initialize statistics for each response card
  const stats = {};
  responses.forEach(card => {
    stats[card] = {
      text: card,
      drawn: 0,
      played: 0,
      won: 0,
      heuristics: analyzeResponseStatic(card),
    };
  });

  // 2. Run Bot Simulation
  simulateGames(prompts, responses, roundsCount, stats);

  // 3. Process results and assign grades
  const evaluatedResponses = Object.keys(stats).map(text => {
    const s = stats[text];
    const playRate = s.drawn > 0 ? s.played / s.drawn : 0;
    const winRate = s.played > 0 ? s.won / s.played : 0;
    
    // Impact is play frequency times win frequency
    const score = (playRate * 0.4) + (winRate * 0.6) * 10;
    
    // Calculate grade
    let grade = "C";
    let flags = [];
    let recommendations = [];

    // Analyze static problems
    if (s.heuristics.punctuationFriction) {
      flags.push("Punctuation Friction");
      recommendations.push("Remove trailing punctuation so card fits neatly in blanks.");
    }
    if (s.heuristics.casingFriction) {
      flags.push("Casing Friction");
      recommendations.push("Use lowercase first letter unless it's a proper noun (e.g. Rizzler) so it reads naturally inside sentences.");
    }
    if (s.heuristics.lengthFriction === "long") {
      flags.push("Wordy");
      recommendations.push("Shorten card description. Punchy, concrete nouns (2-5 words) perform best.");
    } else if (s.heuristics.lengthFriction === "short") {
      flags.push("Too Short");
      recommendations.push("Expand slightly to provide more context or a stronger joke.");
    }

    // Analyze dynamic simulation problems
    if (s.drawn >= 5) {
      if (playRate < 0.15) {
        grade = "D";
        flags.push("Mid (Unplayed)");
        recommendations.push("Bots consistently bypassed this card in their hands. Needs more punch or broader comedic relevance.");
      } else if (winRate < 0.05) {
        grade = "F";
        flags.push("Awkward (Zero Payoff)");
        recommendations.push("Card was played but almost never won. Often fails to deliver a punchline or synergy with prompts.");
      } else if (playRate > 0.6 && winRate > 0.3) {
        grade = "S";
      } else if (playRate > 0.45 && winRate > 0.2) {
        grade = "A";
      } else if (playRate > 0.3 && winRate > 0.12) {
        grade = "B";
      }
    } else {
      // Small sample size default to heuristic score
      const staticScore = s.heuristics.score;
      if (staticScore >= 8) grade = "A";
      else if (staticScore >= 6) grade = "B";
      else if (staticScore >= 4) grade = "C";
      else grade = "D";
    }

    // Overall status description
    let status = "Balanced";
    if (grade === "S") status = "God Tier (Overpowered?)";
    else if (grade === "A") status = "High Quality";
    else if (grade === "D") status = "Mid";
    else if (grade === "F") status = "Awkward";

    return {
      text,
      drawn: s.drawn,
      played: s.played,
      won: s.won,
      playRate: (playRate * 100).toFixed(0) + "%",
      winRate: (winRate * 100).toFixed(0) + "%",
      score: score.toFixed(1),
      heuristics: s.heuristics,
      grade,
      status,
      flags,
      recommendations,
    };
  });

  // Evaluate Prompts statically
  const evaluatedPrompts = prompts.map(p => {
    const text = typeof p === "string" ? p : p.text;
    const pick = typeof p === "object" ? p.pick : 1;
    const staticAnalysis = analyzePromptStatic(text, pick);
    
    return {
      text,
      pick,
      score: staticAnalysis.score,
      grade: staticAnalysis.score >= 8 ? "A" : staticAnalysis.score >= 6 ? "B" : staticAnalysis.score >= 4 ? "C" : "D",
      flags: staticAnalysis.flags,
      recommendations: staticAnalysis.recommendations,
      status: staticAnalysis.score >= 6 ? "Excellent" : "Mid/Awkward",
    };
  });

  // Sort responses by grade and score
  const gradeOrder = { "S": 0, "A": 1, "B": 2, "C": 3, "D": 4, "F": 5 };
  evaluatedResponses.sort((a, b) => {
    if (gradeOrder[a.grade] !== gradeOrder[b.grade]) {
      return gradeOrder[a.grade] - gradeOrder[b.grade];
    }
    return b.score - a.score;
  });

  // Overall metrics
  const midCount = evaluatedResponses.filter(r => r.grade === "D").length;
  const awkwardCount = evaluatedResponses.filter(r => r.grade === "F").length;
  
  return {
    summary: {
      totalResponses: responses.length,
      totalPrompts: prompts.length,
      simulatedRounds: roundsCount,
      midResponsesCount: midCount,
      awkwardResponsesCount: awkwardCount,
      healthIndex: (((responses.length - (midCount + awkwardCount)) / responses.length) * 100).toFixed(0) + "%",
    },
    responses: evaluatedResponses,
    prompts: evaluatedPrompts,
  };
}

/* ==================== STATIC ANALYSIS FUNCTIONS ==================== */

function analyzeResponseStatic(text) {
  let score = 10;
  let flags = [];
  const words = text.split(/\s+/);
  
  // 1. Casing checks (should start with lowercase unless it's a proper noun)
  const firstWord = words[0] || "";
  const startsCapital = firstWord.length > 0 && firstWord[0] === firstWord[0].toUpperCase() && isNaN(firstWord[0]);
  const isProperNoun = /^[A-Z][a-z]+$/.test(firstWord) && (
    firstWord === "Drake" || firstWord === "Ohio" || firstWord === "Costco" || 
    firstWord === "Discord" || firstWord === "Roblox" || firstWord === "Skibidi" ||
    firstWord === "Gronk" || firstWord === "Quandale" || firstWord === "Red" ||
    firstWord === "Baby" || firstWord === "Goon" || firstWord === "Czar" ||
    firstWord === "TikTok" || firstWord === "Monster" || firstWord === "Grimace" ||
    firstWord === "Labubu" || firstWord === "Rizzler" || firstWord === "John" ||
    firstWord === "Minecraft" || firstWord === "Subway" || firstWord === "Costco"
  );

  let casingFriction = false;
  if (startsCapital && !isProperNoun) {
    score -= 2.5;
    casingFriction = true;
  }

  // 2. Trailing punctuation checks
  let punctuationFriction = false;
  if (/[.!?]$/.test(text)) {
    score -= 2.5;
    punctuationFriction = true;
  }

  // 3. Word count checks (versatility / punchiness)
  let lengthFriction = null;
  if (words.length > 8) {
    score -= 2;
    lengthFriction = "long";
  } else if (words.length === 1 && text.length < 4) {
    score -= 1;
    lengthFriction = "short";
  }

  // 4. Absurdity keywords (adds synergy hooks)
  const isFunny = /goon|rizz|edge|sigma|gyatt|sussy|vent|skibidi|ohio|fanum|drake|baka|aura/i.test(text);
  if (isFunny) {
    score += 1;
  }

  return {
    score: Math.max(0, Math.min(10, score)),
    casingFriction,
    punctuationFriction,
    lengthFriction,
    wordCount: words.length,
    synergyHook: isFunny,
  };
}

function analyzePromptStatic(text, pick) {
  let score = 10;
  let flags = [];
  let recommendations = [];

  // Check for blank or question mark
  const hasBlank = text.includes("_______");
  const isQuestion = text.trim().endsWith("?");

  if (!hasBlank && !isQuestion) {
    score -= 4;
    flags.push("No blanks or question mark");
    recommendations.push("This card has no blank slot or question ending. Players won't know where their response fits.");
  }

  // Double blanks pick 2 is excellent, but needs good spacing
  if (pick === 2 && text.split("_______").length < 3) {
    score -= 2;
    flags.push("Pick 2 Mismatch");
    recommendations.push("Prompt specifies Pick 2 but does not contain two blank underlines.");
  }

  // Check for overly restrictive structure (e.g. "a _______")
  if (/\b(a|an)\s+_______/i.test(text)) {
    score -= 2.5;
    flags.push("Grammar bottleneck");
    recommendations.push("Preceding blank with a rigid 'a' or 'an' restricts responses. Change to 'a/an _______' or rephrase.");
  }

  // Check for length
  const words = text.split(/\s+/);
  if (words.length > 25) {
    score -= 1.5;
    flags.push("Wordy prompt");
    recommendations.push("Prompt is too long and complex. Players might lose interest reading it mid-round.");
  }

  return {
    score: Math.max(0, 10, score),
    flags,
    recommendations,
  };
}

/* ==================== DYNAMIC BOT SIMULATION ==================== */

function simulateGames(prompts, responses, roundsCount, stats) {
  const playersCount = 3;
  
  // Setup player hands
  const deck = [...responses];
  // Simple shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const hands = Array.from({ length: playersCount }, () => {
    const hand = [];
    for (let i = 0; i < 10; i++) {
      if (deck.length > 0) {
        const card = deck.pop();
        hand.push(card);
        if (stats[card]) stats[card].drawn++;
      }
    }
    return hand;
  });

  // Discard pile for reshuffling
  const discard = [];

  function drawCard(playerHand) {
    if (deck.length === 0) {
      if (discard.length === 0) return;
      deck.push(...discard);
      discard.length = 0;
      // Reshuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    if (deck.length > 0) {
      const card = deck.pop();
      playerHand.push(card);
      if (stats[card]) stats[card].drawn++;
    }
  }

  // Define Bot Personalities
  const botPersonalities = [
    {
      name: "Sigma Brainrot",
      scorePlay: card => {
        // High preference for brain-rot keywords
        let s = 1;
        if (/goon|edge|sigma|gyatt|rizz|skibidi|fanum|aura/i.test(card)) s += 5;
        if (stats[card] && stats[card].heuristics.casingFriction) s -= 2;
        return s;
      }
    },
    {
      name: "Among Us Sussy",
      scorePlay: card => {
        // Preference forAmong Us, zesty and sussy keywords
        let s = 1;
        if (/vent|sus|baka|impostor|meeting|drake|zesty/i.test(card)) s += 5;
        if (card.length > 30) s -= 1.5; // dislikes long cards
        return s;
      }
    },
    {
      name: "Mild Traditionalist",
      scorePlay: card => {
        // Prefers tamer, grammatical cards, dislikes brainrot
        let s = 2;
        if (/goon|edge|skibidi|mewing|gyatt/i.test(card)) s -= 3;
        if (stats[card] && !stats[card].heuristics.casingFriction && !stats[card].heuristics.punctuationFriction) s += 3;
        return s;
      }
    }
  ];

  // Run rounds
  for (let round = 0; round < roundsCount; round++) {
    // 1. Pick a random prompt
    if (prompts.length === 0) break;
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    const promptText = typeof prompt === "string" ? prompt : prompt.text;
    const pick = typeof prompt === "object" ? prompt.pick : 1;

    // 2. Select a Czar
    const czarIdx = round % playersCount;

    // 3. Submissions from non-Czar players
    const submissions = [];
    for (let pIdx = 0; pIdx < playersCount; pIdx++) {
      if (pIdx === czarIdx) continue;

      const playerHand = hands[pIdx];
      const bot = botPersonalities[pIdx];
      
      // Bot selects best card(s) from hand
      const sortedByPreference = playerHand.map((card, index) => ({
        card,
        index,
        score: bot.scorePlay(card) + (Math.random() * 2), // random variability
      })).sort((a, b) => b.score - a.score);

      const chosenCards = [];
      const indicesToRemove = [];
      for (let i = 0; i < Math.min(pick, sortedByPreference.length); i++) {
        const item = sortedByPreference[i];
        chosenCards.push(item.card);
        indicesToRemove.push(item.index);
        
        // Log play count
        if (stats[item.card]) stats[item.card].played++;
      }

      submissions.push({ player: pIdx, cards: chosenCards });

      // Remove chosen cards from hand, add to discard
      indicesToRemove.sort((a, b) => b - a).forEach(idx => {
        const card = playerHand.splice(idx, 1)[0];
        discard.push(card);
      });
    }

    // 4. Czar chooses the winner
    if (submissions.length > 0) {
      const czarBot = botPersonalities[czarIdx];
      
      const scoredSubmissions = submissions.map(sub => {
        // Czar judges based on prompt compatibility and absolute comedy weight
        let comedyWeight = 0;
        sub.cards.forEach(card => {
          // Base score
          comedyWeight += 3;
          
          // Static heuristics penalty
          if (stats[card]) {
            comedyWeight += stats[card].heuristics.score * 0.4;
          }

          // Topic correlation synergy
          const hasBrainrotPrompt = /sigma|goon|edg|mew|looksmax|skibidi|rizz|vent|electrical|impostor/i.test(promptText);
          const hasBrainrotResponse = /goon|edge|sigma|gyatt|rizz|skibidi|fanum|aura|vent|sus|baka|impostor|meeting|drake/i.test(card);

          if (hasBrainrotPrompt && hasBrainrotResponse) {
            comedyWeight += 4; // High thematic matching bonus!
          } else if (!hasBrainrotPrompt && !hasBrainrotResponse) {
            comedyWeight += 1.5; // Normal cozy synergy matching bonus
          } else {
            comedyWeight -= 1; // Mismatch penalty
          }
        });

        return {
          ...sub,
          score: comedyWeight + (Math.random() * 3), // random human whim factor
        };
      });

      // Sort submissions by Czar preference
      scoredSubmissions.sort((a, b) => b.score - a.score);
      const winningSub = scoredSubmissions[0];
      
      // Log win
      winningSub.cards.forEach(card => {
        if (stats[card]) stats[card].won++;
      });
    }

    // 5. Replenish hands
    for (let pIdx = 0; pIdx < playersCount; pIdx++) {
      if (pIdx === czarIdx) continue;
      const playerHand = hands[pIdx];
      while (playerHand.length < 10) {
        drawCard(playerHand);
      }
    }
  }
}
