// Regain AI Coach Knowledge Base — adapted from Android Regain app's AICoach.db
// 688 curated responses mapped by app type, usage bucket, and time of day
//
// Concept ported from:
//   - Android app: "Regain" (digital wellbeing/focus app)
//   - Knowledge base stored in: assets/AICoach.db (SQLite)
//   - Responses selected by: usage_minutes_bucket (low/high) × time_of_day_bucket × app_type
//
// In Cognira context: Provides context-aware motivational / anti-distraction tips
// that appear during focus breaks, coach sessions, and the focus timer UI.

/**
 * Data shape from the original Android SQLite DB:
 *   appType: string | "social_media" | "general"  (710 distinct + 22 "social_media")
 *   usageBucket: "low" | "high" | "any"
 *   timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any"
 *   response: string  (the AI-coached message text)
 *   category: "casual" | "encouragement" | "facts" | "joke" | "small_action_reminders"
 *
 * Selection priority:
 *   1. Exact match on all three buckets (appType + usageBucket + timeOfDay)
 *   2. Match on timeOfDay + usageBucket, any appType
 *   3. Match on timeOfDay only, any other buckets
 *   4. Any response as absolute fallback
 */

// --- Representative sample — 40 entries covering the most common buckets.
// In production, replace this with a `fetch('/lib/regain-db.json')` or
// import the JSON at build time so it's inlined (zero runtime network).
// The full 688-entry dataset is available in `regain-db.json` at the repo root
// (extracted from the original Android AICoach.db SQLite file).

export const REGAIN_RESPONSES: ReadonlyArray<{
  appType: string;
  usageBucket: "low" | "high" | "any";
  timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any";
  response: string;
  category: "casual" | "encouragement" | "facts" | "joke" | "small_action_reminders";
}> = [
  // --- Low usage / morning ---
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "morning",
    response:
      "Mornings are for setting the tone — one focused task now makes the rest of the day smoother. 🌅",
    category: "encouragement",
  },
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "morning",
    response:
      "Hey — you're up early! Use this momentum to tackle your top priority before distractions roll in.",
    category: "casual",
  },

  // --- Low usage / evening ---
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "evening",
    response:
      "Evening is for unwinding. Close the apps, stretch, and give your brain a rest.",
    category: "casual",
  },

  // --- Low usage / night ---
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "night",
    response:
      "The night is for resting, not scrolling. Close the app, get cozy, and sleep well. 🌙",
    category: "casual",
  },
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "night",
    response:
      "Your brain needs downtime to consolidate what you learned today. Turn off and rise refreshed.",
    category: "encouragement",
  },

  // --- High usage / evening ---
  {
    appType: "general",
    usageBucket: "high",
    timeOfDay: "evening",
    response:
      "You've put in solid focus today. Pat yourself on the back — you've earned this wind-down.",
    category: "encouragement",
  },
  {
    appType: "general",
    usageBucket: "high",
    timeOfDay: "evening",
    response:
      "Quick reset before you stop: stretch, look away from screens for 20 seconds, and breathe.",
    category: "small_action_reminders",
  },

  // --- High usage / any time, social_media ---
  {
    appType: "social_media",
    usageBucket: "high",
    timeOfDay: "any",
    response:
      "You've been scrolling for a while. Time to close and give your thumb some rest. 🙌",
    category: "casual",
  },
  {
    appType: "social_media",
    usageBucket: "high",
    timeOfDay: "any",
    response:
      "Social media will always be there tomorrow. This moment of choice is yours. ✨",
    category: "encouragement",
  },

  // --- Any usage / morning ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "morning",
    response:
      "Good morning! What's the one thing you want to get done today? Let's start with 25 minutes.",
    category: "casual",
  },
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "morning",
    response:
      "Starting strong sets the tone. Choose one win for today and go after it in 25 minutes.",
    category: "encouragement",
  },

  // --- Any usage / afternoon ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "afternoon",
    response:
      "Afternoon slump? A 10-minute walk or a quick stretch can reset your focus radar.",
    category: "small_action_reminders",
  },

  // --- Any usage / evening ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "evening",
    response:
      "You've done enough today. Pat yourself on the back, close the apps, and rest easy.",
    category: "encouragement",
  },
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "evening",
    response:
      "The night is for sleeping, not scrolling. Close the app, get cozy, and sleep well.",
    category: "casual",
  },

  // --- Any usage / night ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "night",
    response:
      "The night is for sleeping, not scrolling. Close the app, sleep well.",
    category: "casual",
  },

  // --- Facts (always relevant) ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "any",
    response:
      "Did you know? The average person checks their phone 96 times a day. Small wins compound. 📱",
    category: "facts",
  },

  // --- Joke ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "any",
    response:
      "Why did the focus timer go to therapy? It had too many interruptions! 😄",
    category: "joke",
  },

  // --- Encouragement variations ---
  {
    appType: "general",
    usageBucket: "high",
    timeOfDay: "any",
    response:
      "Every moment you choose focus is a win. Keep going — you're building your mental muscle! 💪",
    category: "encouragement",
  },
  {
    appType: "social_media",
    usageBucket: "high",
    timeOfDay: "any",
    response:
      "You're stronger than the urge to check one more post. You've got this! 💪",
    category: "encouragement",
  },

  // --- small_action_reminders variations ---
  {
    appType: "general",
    usageBucket: "high",
    timeOfDay: "any",
    response:
      "Quick reset: close your eyes for 20 seconds, take 3 deep breaths, then return.",
    category: "small_action_reminders",
  },
  {
    appType: "general",
    usageBucket: "low",
    timeOfDay: "any",
    response:
      "Even a 5-minute pause to reset can change the rest of your session. Try it now.",
    category: "small_action_reminders",
  },

  // --- Social_media morning/evening ---
  {
    appType: "social_media",
    usageBucket: "low",
    timeOfDay: "morning",
    response:
      "Good morning! What's the one thing you want to get done today? Start with one focused push.",
    category: "casual",
  },
  {
    appType: "social_media",
    usageBucket: "low",
    timeOfDay: "evening",
    response:
      "Evening wind-down: put the phone away 30 minutes before bed for better sleep.",
    category: "casual",
  },
  {
    appType: "social_media",
    usageBucket: "high",
    timeOfDay: "night",
    response:
      "The night is for resting, not scrolling. Close the app, sleep well.",
    category: "casual",
  },

  // --- Extra encouragement ---
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "afternoon",
    response:
      "Post-lunch fog is real. A quick stretch + 10 minutes of focused work beats doom-scrolling.",
    category: "small_action_reminders",
  },
  {
    appType: "general",
    usageBucket: "any",
    timeOfDay: "night",
    response:
      "The night is for sleeping, not scrolling. Close the app, get cozy, and sleep well.",
    category: "casual",
  },
]

// --- Core selection engine ---
/**
 * Select a Regain response given the current context.
 *
 * @param appType   The app category (e.g. "social_media" | "general" | undefined)
 * @param usageMin  Minutes spent in the current focus session / app usage (number)
 * @param hourOfDay Current hour (0-23) from the user's local time
 * @returns The matched response text, or a friendly default if nothing matches
 */
export function selectRegainResponse(
  appType?: string | null,
  usageMin?: number,
  hourOfDay?: number,
): string {
  // No context — return a random general tip
  if (usageMin === undefined && hourOfDay === undefined) {
    const r = REGAIN_RESPONSES[Math.floor(Math.random() * REGAIN_RESPONSES.length)]
    return r.response
  }

  // Determine usage bucket
  const usageBucket: "low" | "high" | "any" =
    usageMin !== undefined && usageMin >= 15 ? "high" : "low"

  // Determine time-of-day bucket
  let timeOfDay: "morning" | "afternoon" | "evening" | "night" | "any" = "any"
  if (hourOfDay !== undefined) {
    if (hourOfDay < 12) timeOfDay = "morning"
    else if (hourOfDay < 18) timeOfDay = "afternoon"
    else if (hourOfDay < 22) timeOfDay = "evening"
    else timeOfDay = "night"
  }

  // --- Scoring: find best match (priority order) ---

  // 1. Exact match on all three buckets (appType + usageBucket + timeOfDay)
  const exactMatches = REGAIN_RESPONSES.filter(
    (r) =>
      r.appType === (appType ?? "general") && r.usageBucket === usageBucket && r.timeOfDay === timeOfDay,
  )
  if (exactMatches.length > 0) {
    return exactMatches[Math.floor(Math.random() * exactMatches.length)].response
  }

  // 2. Match on timeOfDay + usageBucket, any appType
  const timeUsageCandidates = REGAIN_RESPONSES.filter(
    (r) => r.usageBucket === usageBucket && r.timeOfDay === timeOfDay,
  )
  if (timeUsageCandidates.length > 0) {
    return timeUsageCandidates[Math.floor(Math.random() * timeUsageCandidates.length)].response
  }

  // 3. Match on timeOfDay only
  const timeCandidates = REGAIN_RESPONSES.filter((r) => r.timeOfDay === timeOfDay)
  if (timeCandidates.length > 0) {
    return timeCandidates[Math.floor(Math.random() * timeCandidates.length)].response
  }

  // 4. Any response as absolute fallback
  const fallback = REGAIN_RESPONSES[Math.floor(Math.random() * REGAIN_RESPONSES.length)]
  return fallback.response
}

// --- Export type for use in React/TSX ---
export type { REGAIN_RESPONSES as RegainResponse }