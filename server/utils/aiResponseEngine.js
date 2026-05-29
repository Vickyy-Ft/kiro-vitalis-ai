/**
 * VITALIS AI — AI Response Engine
 * Keyword-based intent detection + context-aware response generation.
 */

const INTENT_KEYWORDS = {
  stressed:    ['stressed', 'stress', 'overwhelmed', 'pressure', 'tense', 'anxious', 'anxiety', 'nervous', 'worried', 'panic', 'burnout'],
  tired:       ['tired', 'exhausted', 'fatigue', 'sleepy', 'drained', 'low energy', 'no energy', 'sluggish', 'weak', 'lethargic'],
  sad:         ['sad', 'depressed', 'unhappy', 'down', 'lonely', 'hopeless', 'empty', 'miserable', 'crying', 'grief'],
  headache:    ['headache', 'migraine', 'head hurts', 'head pain', 'throbbing', 'head ache'],
  sick:        ['sick', 'ill', 'nauseous', 'nausea', 'vomiting', 'fever', 'cold', 'flu', 'unwell', 'not feeling well'],
  angry:       ['angry', 'frustrated', 'irritated', 'annoyed', 'rage', 'furious', 'mad', 'upset'],
  burnout:     ['burnout', 'burn out', 'burnt out', 'overworked', 'no motivation', 'giving up', 'cant continue'],
  sleep:       ['sleep', 'insomnia', 'cant sleep', "can't sleep", 'woke up', 'rest', 'sleeping', 'bedtime'],
  hydration:   ['water', 'thirsty', 'dehydrated', 'drink', 'hydration', 'hydrate'],
  food:        ['eat', 'food', 'hungry', 'meal', 'diet', 'nutrition', 'snack', 'appetite'],
  happy:       ['happy', 'great', 'good', 'amazing', 'wonderful', 'fantastic', 'excellent', 'feeling good', 'energized'],
  score:       ['score', 'wellness score', 'how am i doing', 'progress', 'stats', 'my score'],
  routine:     ['routine', 'schedule', 'habits', 'daily routine', 'tasks'],
  motivation:  ['motivation', 'motivated', 'inspire', 'goal', 'purpose', 'focus'],
};

/**
 * Detect intent from user message
 */
function detectIntent(message) {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return intent;
  }
  return 'default';
}

/**
 * Detect mood label from message
 */
function detectMoodFromMessage(message) {
  const intent = detectIntent(message);
  const moodMap = {
    stressed: 'Stressed', tired: 'Tired', sad: 'Sad',
    angry: 'Angry', burnout: 'Stressed', happy: 'Happy',
    sick: 'Tired', headache: 'Tired',
  };
  return moodMap[intent] || null;
}

/**
 * Generate AI response based on intent + user wellness context
 * @param {string} message - user message
 * @param {Object} context - { sleep, sleepGoal, hydration, waterGoal, mood, score, breakdown }
 */
function generateResponse(message, context = {}) {
  const intent = detectIntent(message);
  const {
    sleep = null, sleepGoal = 7.5,
    hydration = 0, waterGoal = 8,
    mood = null, score = null,
    breakdown = {},
  } = context;

  const responses = {
    stressed: () => {
      const parts = ['I can sense you\'re under stress. Let me check your wellness data.'];
      if (sleep !== null && sleep < sleepGoal)
        parts.push(`You slept only ${sleep}h last night (goal: ${sleepGoal}h) — sleep deprivation significantly amplifies stress.`);
      if (hydration < waterGoal / 2)
        parts.push(`Your hydration is at ${hydration}/${waterGoal} glasses. Dehydration raises cortisol levels.`);
      parts.push(
        '\n🌿 Immediate recommendations:\n' +
        '• Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s\n' +
        '• Drink a glass of warm water or herbal tea\n' +
        '• Step outside for 5 minutes of fresh air\n' +
        '• Eat magnesium-rich foods: dark chocolate, almonds, or spinach\n\n' +
        'You\'re doing better than you think. One breath at a time. 💙'
      );
      return parts.join(' ');
    },

    tired: () => {
      const parts = ['Fatigue detected. Let me analyze your wellness data.'];
      if (sleep !== null)
        parts.push(`Sleep: ${sleep}h (goal: ${sleepGoal}h).`);
      if (hydration < 4)
        parts.push(`Hydration is very low at ${hydration} glasses — this is a major energy drain.`);
      parts.push(
        '\n⚡ Energy restoration plan:\n' +
        '• Drink 2 glasses of water immediately\n' +
        '• Eat iron-rich foods: spinach, lentils, dates, or eggs\n' +
        '• Take a 10–20 minute power nap if possible\n' +
        '• Avoid sugar — it causes energy crashes\n' +
        '• Light movement like a short walk can boost energy by 20%'
      );
      return parts.join(' ');
    },

    sad: () =>
      'I hear you, and what you\'re feeling is completely valid. 💙\n\n' +
      'Here\'s what can help:\n' +
      '• Sunlight exposure for 10 minutes boosts serotonin naturally\n' +
      '• Light exercise releases endorphins — even a short walk helps\n' +
      '• Connect with someone you trust\n' +
      '• Foods rich in omega-3 (salmon, walnuts) support brain chemistry\n' +
      '• Journaling your thoughts can provide emotional clarity\n\n' +
      'You\'re not alone in this. Small steps forward still count.',

    headache: () => {
      let msg = 'Headaches often signal dehydration or tension. ';
      if (hydration < 4)
        msg += `Your hydration is low (${hydration} glasses) — this is likely contributing.\n\n`;
      msg +=
        '💊 Relief strategies:\n' +
        '• Drink 2 glasses of water now\n' +
        '• Apply gentle pressure to your temples\n' +
        '• Rest in a dark, quiet room for 15 minutes\n' +
        '• Avoid screens if possible\n' +
        '• Magnesium-rich foods can prevent tension headaches';
      return msg;
    },

    sick: () =>
      'I\'m sorry you\'re not feeling well. Here\'s how to support your recovery:\n\n' +
      '🏥 Recovery protocol:\n' +
      '• Hydrate aggressively — aim for 10+ glasses today\n' +
      '• Rest is your most powerful medicine right now\n' +
      '• Warm broths and soups support immunity\n' +
      '• Vitamin C foods: oranges, kiwi, bell peppers\n' +
      '• Ginger tea can help with nausea and inflammation\n' +
      '• Avoid strenuous activity until you feel better',

    angry: () =>
      'Anger is energy — let\'s redirect it constructively.\n\n' +
      '🧘 Immediate de-escalation:\n' +
      '• Take 5 slow, deep breaths before responding to anything\n' +
      '• Physical movement releases tension: a brisk walk or exercise\n' +
      '• Write down what\'s bothering you — it externalizes the emotion\n' +
      '• Cold water on your face activates the dive reflex and calms the nervous system\n\n' +
      'Your feelings are valid. Give yourself space to process.',

    burnout: () =>
      'Burnout is your body\'s emergency signal. This needs immediate attention.\n\n' +
      '🔋 Recovery framework:\n' +
      `• Sleep is non-negotiable: aim for ${sleepGoal}+ hours tonight\n` +
      '• Immediately reduce your task load — say no to non-essentials\n' +
      '• Disconnect from work notifications for at least 2 hours daily\n' +
      '• Spend time in nature — clinically proven to reduce burnout\n' +
      '• Eat nourishing, whole foods and stay hydrated\n' +
      '• Consider speaking to a professional if this persists\n\n' +
      'You matter more than your productivity.',

    sleep: () => {
      let msg = 'Sleep is the foundation of all wellness. ';
      if (sleep !== null)
        msg += `You slept ${sleep}h last night (goal: ${sleepGoal}h). `;
      msg +=
        '\n🌙 Sleep optimization tips:\n' +
        '• Consistent bedtime is more important than duration\n' +
        '• Avoid screens 1 hour before bed — blue light suppresses melatonin\n' +
        '• Keep your room cool (65–68°F / 18–20°C)\n' +
        '• Try the 4-7-8 breathing technique before sleeping\n' +
        '• Avoid caffeine after 2 PM\n' +
        '• Magnesium glycinate before bed can improve sleep quality';
      return msg;
    },

    hydration: () =>
      `Hydration status: ${hydration}/${waterGoal} glasses today.\n\n` +
      '💧 Hydration intelligence:\n' +
      '• Your brain is 75% water — even 2% dehydration impairs cognition\n' +
      '• Drink a glass first thing in the morning to kickstart metabolism\n' +
      '• Add lemon or cucumber for electrolytes\n' +
      '• Eat water-rich foods: cucumber, watermelon, celery\n' +
      `• Target: ${Math.max(0, waterGoal - hydration)} more glasses today`,

    food: () =>
      `Based on your current state${mood ? ` (${mood})` : ''}, here are today's top food recommendations:\n\n` +
      '🍽️ Personalized nutrition:\n' +
      '• Focus on whole, unprocessed foods for sustained energy\n' +
      '• Eat every 3–4 hours to maintain stable blood sugar\n' +
      '• Include protein at every meal for satiety and recovery\n' +
      '• Colorful vegetables provide the widest range of micronutrients\n' +
      '• Stay hydrated — hunger is often mistaken for thirst',

    happy: () =>
      `That\'s wonderful to hear! 🌟${score !== null ? ` Your wellness score is ${score}/100 today.` : ''}\n\n` +
      'Here\'s how to sustain this positive state:\n' +
      '• Log your mood to track what\'s working\n' +
      '• This is a great time to tackle challenging tasks\n' +
      '• Share your energy with others — it multiplies\n' +
      '• Maintain your current sleep and hydration habits\n\n' +
      'You\'re thriving. Keep going.',

    score: () => {
      if (score === null)
        return 'I don\'t have enough data to calculate your score yet. Log your sleep, mood, and hydration to get your personalized wellness score.';
      const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs Improvement';
      return (
        `Your current wellness score is ${score}/100 — ${label}.\n\n` +
        `📊 Score breakdown:\n` +
        `• Sleep: ${breakdown.sleep || 0}%\n` +
        `• Hydration: ${breakdown.hydration || 0}%\n` +
        `• Mood: ${breakdown.mood || 0}%\n` +
        `• Stress: ${breakdown.stress || 0}%\n` +
        `• Routine: ${breakdown.routine || 0}%\n\n` +
        (score >= 80 ? 'Outstanding performance today!' : 'Focus on your lowest scoring area for the biggest improvement.')
      );
    },

    routine: () =>
      'Building consistent routines is one of the most powerful wellness strategies.\n\n' +
      '📋 Routine optimization tips:\n' +
      '• Start with 2–3 non-negotiable habits and build from there\n' +
      '• Anchor new habits to existing ones (habit stacking)\n' +
      '• Morning routines set the tone for the entire day\n' +
      '• Track completion — what gets measured gets improved\n' +
      '• Be flexible: a 60% routine day is better than zero',

    motivation: () =>
      'Your commitment to wellness is already a form of strength. 💪\n\n' +
      '🎯 Motivation framework:\n' +
      '• Focus on systems, not just goals — small daily actions compound\n' +
      '• Celebrate micro-wins: every logged day builds your health intelligence\n' +
      '• Your future self is shaped by what you do today\n' +
      '• Progress, not perfection, is the standard\n\n' +
      `${score !== null ? `Your wellness score of ${score}/100 shows real progress. ` : ''}Keep showing up.`,

    default: () => {
      const parts = ['I\'ve analyzed your wellness data for today.'];
      if (sleep !== null) parts.push(`Sleep: ${sleep}h.`);
      parts.push(`Hydration: ${hydration}/${waterGoal} glasses.`);
      if (mood) parts.push(`Mood: ${mood}.`);
      if (score !== null) parts.push(`Wellness score: ${score}/100.`);
      parts.push(
        '\nWhat specific aspect of your wellness would you like to explore? ' +
        'I can help with stress, sleep, nutrition, hydration, energy, or your overall wellness score.'
      );
      return parts.join(' ');
    },
  };

  const fn = responses[intent] || responses.default;
  return { text: fn(), intent, recommendationType: intent };
}

/**
 * Generate daily AI insight from a wellness log
 */
function generateDailyInsight(log, goals = {}) {
  const sleepGoal = goals.sleepGoal || 7.5;
  const waterGoal = goals.waterGoal || 8;
  const insights = [];

  if (log.sleep?.hours != null) {
    if (log.sleep.hours < sleepGoal - 1)
      insights.push(`Sleep deficit of ${(sleepGoal - log.sleep.hours).toFixed(1)}h detected. Prioritize rest tonight.`);
    else if (log.sleep.hours >= sleepGoal)
      insights.push(`Sleep goal achieved at ${log.sleep.hours}h. Excellent recovery.`);
  }

  if (log.hydration?.glasses != null) {
    const pct = Math.round((log.hydration.glasses / waterGoal) * 100);
    if (pct < 50) insights.push(`Hydration is at ${pct}% — drink more water to maintain energy and focus.`);
    else if (pct >= 100) insights.push('Hydration goal complete! Your body is well-hydrated today.');
  }

  if (log.mood?.label) {
    const negative = ['Stressed', 'Sad', 'Anxious', 'Angry', 'Tired'];
    if (negative.includes(log.mood.label))
      insights.push(`${log.mood.label} mood detected. Consider a breathing exercise or short walk.`);
  }

  if (log.wellnessScore >= 80) insights.push('Outstanding wellness day! Keep this momentum going.');
  else if (log.wellnessScore < 50) insights.push('Wellness score is low today. Focus on sleep and hydration first.');

  return insights.join(' ') || 'Log more data to receive personalized daily insights.';
}

module.exports = { generateResponse, detectIntent, detectMoodFromMessage, generateDailyInsight };
