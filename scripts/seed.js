#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const loadEnv = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key}. Add it to .env or your shell.`);
  }
  return value;
};

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const PROFILE_PHOTOS_DIR = path.join(process.cwd(), "graphics", "profilepics");

const toContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
};

const uploadSeedProfilePhoto = async ({ supabase, userId, profilePhotoFileName }) => {
  const trimmedName =
    typeof profilePhotoFileName === "string" ? profilePhotoFileName.trim() : "";
  if (!trimmedName) return null;

  const sourcePath = path.join(PROFILE_PHOTOS_DIR, trimmedName);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing profile photo file: ${sourcePath}`);
  }

  const fileBytes = fs.readFileSync(sourcePath);
  if (!fileBytes || fileBytes.length === 0) {
    throw new Error(`Profile photo is empty: ${sourcePath}`);
  }

  const normalizedExt = path.extname(trimmedName).toLowerCase() || ".jpg";
  const avatarPath = `${userId}/seed-avatar${normalizedExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(avatarPath, fileBytes, {
      contentType: toContentType(trimmedName),
      upsert: true,
    });
  if (uploadError) throw uploadError;

  return avatarPath;
};

const deleteAllUsers = async (supabase) => {
  const perPage = 100;
  let page = 1;
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user.id,
      );
      if (deleteError) throw deleteError;
      deleted += 1;
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return deleted;
};

const formatLocalDate = (date, timeZone) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededUnitRandom = (seed, salt) => {
  const mixed = hashString(`${seed}:${salt}`);
  return mixed / 4294967296;
};

const buildWeighIns = ({
  userId,
  timeZone,
  days,
  baseWeight,
  trendPerDay = 0,
  lastWeekPattern = [0.4, -0.2, 0.6, -0.1, 0.3, -0.5, 0.2],
  variationSeed = userId,
}) => {
  const now = new Date();
  const entries = [];
  const recentSkipRate = 0.04 + seededUnitRandom(variationSeed, "recent-skip-rate") * 0.08;
  const monthSkipRate = 0.12 + seededUnitRandom(variationSeed, "month-skip-rate") * 0.12;
  const quarterSkipRate = 0.16 + seededUnitRandom(variationSeed, "quarter-skip-rate") * 0.16;
  const olderSkipRate = 0.2 + seededUnitRandom(variationSeed, "older-skip-rate") * 0.18;
  const wavePhase = seededUnitRandom(variationSeed, "weight-wave-phase") * Math.PI * 2;
  const waveAmplitude = 0.08 + seededUnitRandom(variationSeed, "weight-wave-amplitude") * 0.2;

  const shouldSkip = (offsetFromToday) => {
    if (offsetFromToday <= 2) return false;

    const draw = seededUnitRandom(variationSeed, `skip-${offsetFromToday}`);
    if (offsetFromToday <= 14) return draw < recentSkipRate;
    if (offsetFromToday <= 30) return draw < monthSkipRate;
    if (offsetFromToday <= 90) return draw < quarterSkipRate;
    return draw < olderSkipRate;
  };

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const offsetFromToday = offset;
    if (shouldSkip(offsetFromToday)) continue;

    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    date.setHours(7, 30, 0, 0);

    const index = days - 1 - offset;
    let weight;
    const trendOffset = -trendPerDay * offsetFromToday;
    if (offsetFromToday < lastWeekPattern.length) {
      weight = baseWeight + lastWeekPattern[offsetFromToday] + trendOffset;
    } else {
      const variation = Math.sin(index / 5) * 0.6 + Math.cos(index / 9) * 0.3;
      const drift = Math.sin(index / 17) * 0.2;
      const userWave = Math.sin(index / 23 + wavePhase) * waveAmplitude;
      weight = baseWeight + variation + drift + userWave + trendOffset;
    }
    weight = Math.round(weight * 10) / 10;

    entries.push({
      user_id: userId,
      weight,
      unit: "lb",
      recorded_at: date.toISOString(),
      local_date: formatLocalDate(date, timeZone),
      timezone: timeZone,
    });
  }

  return entries;
};

const shuffleArray = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getWeekStartDate = (timeZone) => {
  const todayLocal = formatLocalDate(new Date(), timeZone);
  const date = new Date(`${todayLocal}T00:00:00Z`);
  const day = date.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offsetToMonday);
  return date;
};

const buildGymSessions = ({ userId, timeZone, target, blockedSessionDates = [] }) => {
  const weekStart = getWeekStartDate(timeZone);
  const blocked = new Set(
    (Array.isArray(blockedSessionDates) ? blockedSessionDates : [])
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );
  const candidateDays = shuffleArray([0, 1, 2, 3, 4, 5, 6]).filter((offset) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + offset);
    const sessionDate = formatLocalDate(date, timeZone);
    return !blocked.has(sessionDate);
  });

  const maxSessions = Math.min(Math.max(target, 1), candidateDays.length);
  const count = Math.floor(Math.random() * (maxSessions + 1));
  const dayIndexes = candidateDays.slice(0, count);

  return dayIndexes.map((offset) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + offset);
    date.setHours(18, 10, 0, 0);
    return {
      user_id: userId,
      session_date: formatLocalDate(date, timeZone),
      status: "verified",
      recorded_at: date.toISOString(),
      verified_at: date.toISOString(),
      timezone: timeZone,
    };
  });
};

const buildActivityEvents = ({ userId, weighIns, gymSessions }) => {
  const weighInEvents = weighIns.map((entry) => ({
    actor_user_id: userId,
    event_type: "weigh_in_logged",
    event_date: entry.local_date,
    source_table: "weigh_ins",
    source_id: null,
    payload: { milestone: "weigh_in_logged" },
    visibility: "private",
  }));

  const gymSessionEvents = gymSessions
    .filter((entry) => entry.status === "verified")
    .map((entry) => ({
      actor_user_id: userId,
      event_type: "gym_session_verified",
      event_date: entry.session_date,
      source_table: "gym_sessions",
      source_id: null,
      payload: { milestone: "gym_session_verified" },
      visibility: "private",
    }));

  return [...weighInEvents, ...gymSessionEvents];
};

const FITNESS_POST_LINES = [
  "Locked in a clean workout today and kept the pace steady.",
  "Small wins stack up. Stayed consistent and showed up.",
  "Focused on form over ego and it felt great.",
  "Recovery day done right: walk, stretch, hydrate.",
  "Hit my target session and finished stronger than I started.",
  "Kept the routine simple and actually followed through.",
  "Progress feels slow until you look back a few weeks.",
  "Early session complete. Momentum is the goal.",
  "Stayed patient with the process and kept moving.",
  "Another day of consistency in the books.",
];

const LONG_FITNESS_POST_LINES = [
  "Checked in for a longer update today: training felt heavy in the first half, but I slowed down, focused on clean reps, and finished strong. The big win was staying patient instead of chasing numbers, and I want to keep that same discipline tomorrow.",
  "Quick reflection after this week: sleep and hydration made a bigger difference than I expected. I tracked my meals, kept portions steady, and still had enough energy to push the final set. The scale barely moved, but consistency is finally becoming automatic.",
  "Longer note for accountability: I almost skipped this session after work, but I went anyway and kept it simple. Warmup, compound lifts, short cooldown, done. No heroics, just execution. This kind of boring consistency is exactly what I need right now.",
];

const buildPosts = ({ userId, accountVisibility, count }) => {
  const now = new Date();
  const safeCount = Math.max(0, count);
  const longPostEvery = 5;

  return Array.from({ length: safeCount }, (_, index) => {
    const shouldUseLongPost = index % longPostEvery === 0;
    const randomLine = shouldUseLongPost
      ? LONG_FITNESS_POST_LINES[Math.floor(Math.random() * LONG_FITNESS_POST_LINES.length)]
      : FITNESS_POST_LINES[Math.floor(Math.random() * FITNESS_POST_LINES.length)];
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - index * 2 - Math.floor(Math.random() * 2));
    createdAt.setHours(12 + (index % 4), 10, 0, 0);

    return {
      author_user_id: userId,
      post_type: "text",
      body: randomLine,
      visibility: accountVisibility === "public" ? "public" : "followers",
      created_at: createdAt.toISOString(),
    };
  });
};

const addDaysUtc = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const ensureCoachThread = async ({
  supabase,
  userId,
  specialization,
  coachProfileId,
}) => {
  let threadId = null;
  const { data: existingThread, error: threadLookupError } = await supabase
    .from("coach_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .eq("coach_profile_id", coachProfileId)
    .maybeSingle();
  if (threadLookupError) throw threadLookupError;
  threadId = existingThread?.id ?? null;

  if (!threadId) {
    const { data: insertedThread, error: threadInsertError } = await supabase
      .from("coach_threads")
      .insert([
        {
          user_id: userId,
          specialization,
          coach_profile_id: coachProfileId,
          last_message_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();
    if (threadInsertError) throw threadInsertError;
    threadId = insertedThread?.id ?? null;
  }

  if (!threadId) {
    throw new Error(
      `Failed to create ${specialization} coach thread for seeded account.`,
    );
  }

  return threadId;
};

const seedAccountANutritionCheckins = async ({ supabase, userId, timeZone }) => {
  const workoutCoachProfileId = "man_analyst";
  const nutritionCoachProfileId = "nutrition_man_analyst";
  const selectedAt = new Date().toISOString();

  const { error: activeCoachError } = await supabase
    .from("active_coaches")
    .upsert(
      [
        {
          user_id: userId,
          specialization: "workout",
          coach_profile_id: workoutCoachProfileId,
          selected_at: selectedAt,
        },
        {
          user_id: userId,
          specialization: "nutrition",
          coach_profile_id: nutritionCoachProfileId,
          selected_at: selectedAt,
        },
      ],
      { onConflict: "user_id,specialization" },
    );
  if (activeCoachError) throw activeCoachError;

  const workoutThreadId = await ensureCoachThread({
    supabase,
    userId,
    specialization: "workout",
    coachProfileId: workoutCoachProfileId,
  });
  const nutritionThreadId = await ensureCoachThread({
    supabase,
    userId,
    specialization: "nutrition",
    coachProfileId: nutritionCoachProfileId,
  });

  // Seed the new coach artifact profile for account a only.
  const { error: coachUserProfileError } = await supabase
    .from("coach_user_profiles")
    .upsert(
      [
        {
          user_id: userId,
          profile_json: {
            goals: {
              primary: "maintain",
              targetRatePctPerWeek: null,
              targetDate: null,
            },
            experienceLevel: "intermediate",
            heightCm: 183,
            weightKg: 93,
            age: 34,
            sex: "male",
            equipmentAccess: "full_gym",
            dietaryPreferences: ["high_protein", "simple_meals"],
            dietaryRestrictions: [],
            injuriesLimitations: [],
            scheduleConstraints: {
              trainingDaysPerWeek: 4,
              sessionMinutes: 45,
              notes: "Evening sessions are most consistent.",
            },
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      { onConflict: "user_id" },
    );
  if (coachUserProfileError) throw coachUserProfileError;

  const nowIso = new Date().toISOString();
  const seededWorkoutPlan = {
    title: "Upper/Lower Foundations",
    daysPerWeek: 4,
    notes: [
      "Keep 1-2 reps in reserve on compound lifts.",
      "Add load only when all reps are completed with clean form.",
    ],
    schedule: [
      {
        dayLabel: "Day 1",
        focus: "Upper Push/Pull",
        items: [
          { name: "Bench Press", sets: "4", reps: "6-8" },
          { name: "Chest-Supported Row", sets: "4", reps: "8-10" },
          { name: "Incline Dumbbell Press", sets: "3", reps: "8-10" },
          { name: "Lat Pulldown", sets: "3", reps: "10-12" },
        ],
      },
      {
        dayLabel: "Day 2",
        focus: "Lower Strength",
        items: [
          { name: "Back Squat", sets: "4", reps: "5-7" },
          { name: "Romanian Deadlift", sets: "3", reps: "8-10" },
          { name: "Leg Press", sets: "3", reps: "10-12" },
          { name: "Standing Calf Raise", sets: "3", reps: "12-15" },
        ],
      },
      {
        dayLabel: "Day 3",
        focus: "Upper Hypertrophy",
        items: [
          { name: "Overhead Press", sets: "4", reps: "6-8" },
          { name: "Cable Row", sets: "4", reps: "8-10" },
          { name: "Lateral Raise", sets: "3", reps: "12-15" },
          { name: "Cable Curl", sets: "3", reps: "10-12" },
        ],
      },
      {
        dayLabel: "Day 4",
        focus: "Lower Hypertrophy",
        items: [
          { name: "Front Squat", sets: "3", reps: "6-8" },
          { name: "Hip Thrust", sets: "4", reps: "8-10" },
          { name: "Walking Lunge", sets: "3", reps: "10 each leg" },
          { name: "Hamstring Curl", sets: "3", reps: "10-12" },
        ],
      },
    ],
  };
  const seededNutritionPlan = {
    title: "High-Protein Weekday Template",
    dailyCaloriesTarget: 2550,
    macros: {
      proteinG: 210,
      carbsG: 250,
      fatsG: 80,
    },
    meals: [
      {
        name: "Breakfast",
        targetCalories: 620,
        items: [
          "3 whole eggs + 3 egg whites",
          "1 cup oatmeal",
          "1 cup berries",
        ],
      },
      {
        name: "Lunch",
        targetCalories: 700,
        items: [
          "7 oz chicken breast",
          "1.5 cups cooked rice",
          "Large mixed vegetables",
        ],
      },
      {
        name: "Snack",
        targetCalories: 430,
        items: [
          "1 scoop whey protein",
          "1 banana",
          "1 oz almonds",
        ],
      },
      {
        name: "Dinner",
        targetCalories: 800,
        items: [
          "7 oz salmon or lean beef",
          "10 oz potato",
          "Large salad with light dressing",
        ],
      },
    ],
    notes: [
      "Hit protein target first, then fill carbs/fats.",
      "Keep one backup high-protein frozen meal for busy days.",
    ],
  };

  const { error: planSeedError } = await supabase.from("coach_plans").insert([
    {
      user_id: userId,
      thread_id: workoutThreadId,
      type: "workout",
      status: "active",
      title: seededWorkoutPlan.title,
      plan_json: seededWorkoutPlan,
      version: 1,
      supersedes_plan_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      user_id: userId,
      thread_id: nutritionThreadId,
      type: "nutrition",
      status: "active",
      title: seededNutritionPlan.title,
      plan_json: seededNutritionPlan,
      version: 1,
      supersedes_plan_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]);
  if (planSeedError) throw planSeedError;

  const currentWeekStart = getWeekStartDate(timeZone);
  const blockersByWeek = [
    "",
    "Travel days made meal timing inconsistent.",
    "Late meetings twice this week.",
    "Weekend social meals were hard to estimate.",
    "Skipped grocery run until midweek.",
    "Low prep time after work.",
  ];
  const summaryByWeek = [
    "Strong adherence this week. Keep protein high at breakfast and repeat your weekday meal template.",
    "Good recovery after a noisy week. Plan one fallback meal for high-stress days to protect consistency.",
    "Adherence dipped slightly, but trend stayed controlled. Prioritize two prepped lunches next week.",
    "Solid rebound. Keep the same calorie target and watch weekend portions.",
    "Steady execution this week. Keep weekday meal timing tight and pre-plan one flexible social meal.",
    "Momentum is positive. Your baseline plan is working when prep is done early.",
  ];

  const rows = [];
  const weeksToSeed = 18;
  const trainingDifficultyByWeek = ["right", "too_hard", "right", "too_easy", "right", "right"];
  const adherenceSubjectiveByWeek = ["high", "medium", "medium", "high", null, "high"];
  const focusHabits = [
    "Pre-log dinner before 5pm on weekdays.",
    "Keep two high-protein backup meals ready.",
    "Plan social meals with portion guardrails.",
  ];

  for (let weekOffset = weeksToSeed - 1; weekOffset >= 0; weekOffset -= 1) {
    const weekStartDate = addDaysUtc(currentWeekStart, -7 * weekOffset);
    const weekEndDate = addDaysUtc(weekStartDate, 6);
    const profileWeek = weeksToSeed - 1 - weekOffset;
    const startWeight = Math.round((207.8 - profileWeek * 0.24 + Math.sin(profileWeek / 3) * 0.5) * 10) / 10;
    const delta = Math.round((Math.sin(profileWeek / 2.6) * 0.2 - 0.3) * 10) / 10;
    const endWeight = Math.round((startWeight + delta) * 10) / 10;
    const trend = delta < -0.05 ? "down" : delta > 0.05 ? "up" : "flat";
    const adherence = Math.max(62, Math.min(95, Math.round(74 + Math.sin(profileWeek / 2.3) * 11)));
    const energy = Math.max(2, Math.min(5, Math.round(3 + Math.cos(profileWeek / 3.2) * 1.1)));
    const blockers = blockersByWeek[profileWeek % blockersByWeek.length];
    const consistencyNotes = blockers || "No major blockers this week.";
    const coachSummary =
      summaryByWeek[profileWeek % summaryByWeek.length] ??
      "Consistent progress this week. Keep your core nutrition habits unchanged and repeat next week.";
    const trainingDifficulty = trainingDifficultyByWeek[profileWeek % trainingDifficultyByWeek.length];
    const adherenceSubjective = adherenceSubjectiveByWeek[profileWeek % adherenceSubjectiveByWeek.length];
    const stressLevel = Math.max(1, Math.min(5, Math.round(3 + Math.sin(profileWeek / 2.8) * 1.2)));
    const sleepQuality = Math.max(1, Math.min(5, Math.round(3 + Math.cos(profileWeek / 3.1) * 1.1)));
    const sleepAvgHours = Math.max(
      5.8,
      Math.min(8.4, Math.round((6.9 + Math.sin(profileWeek / 3.7) * 0.9) * 10) / 10),
    );
    const computedAdherenceScore = adherence;
    const currentWeightKg = Math.round((endWeight * 0.45359237) * 10) / 10;
    const updatedAt = addDaysUtc(weekEndDate, 0);
    updatedAt.setUTCHours(20, 20, 0, 0);
    const createdAt = addDaysUtc(weekStartDate, 0);
    createdAt.setUTCHours(18, 15, 0, 0);

    const checkinJson = {
      timestamp: updatedAt.toISOString(),
      linkedPlanVersion: {
        workoutVersion: null,
        nutritionVersion: null,
      },
      currentWeightKg,
      waistCm: profileWeek % 4 === 0 ? 97 - Math.round(profileWeek / 4) : null,
      progressPhotoPrompted: profileWeek % 2 === 0,
      strengthPRs:
        profileWeek % 3 === 0
          ? "Bench press felt stronger this block."
          : "No notable PRs this week.",
      consistencyNotes,
      bodyCompChanges:
        delta < 0
          ? "Waistline feels slightly tighter."
          : "Body composition felt mostly stable.",
      trainingDifficulty,
      nutritionAdherencePercent: adherence,
      nutritionAdherenceSubjective: adherenceSubjective,
      appetiteCravings:
        profileWeek % 3 === 1
          ? "Cravings increased during late meetings."
          : "Appetite felt controlled most days.",
      energyRating: energy,
      recoveryRating: Math.max(1, Math.min(5, energy - (profileWeek % 2 === 0 ? 0 : 1))),
      sleepAvgHours,
      sleepQuality,
      stressLevel,
      scheduleConstraintsNextWeek:
        profileWeek % 4 === 2
          ? "Two travel days next week."
          : "Standard work schedule expected.",
      injuryPain: {
        hasPain: false,
        details: "",
        redFlags: false,
      },
      computedAdherenceScore,
    };

    const adjustmentJson = {
      id: `seed-adj-${toIsoDate(weekStartDate)}`,
      workoutDiff:
        trainingDifficulty === "too_hard"
          ? [{ op: "replace", path: "/progression/intensity_delta_pct", value: -4 }]
          : trainingDifficulty === "too_easy"
            ? [{ op: "replace", path: "/progression/intensity_delta_pct", value: 3 }]
            : [],
      nutritionDiff:
        adherence < 70
          ? [{ op: "replace", path: "/targets/calorie_strategy", value: "ease_deficit" }]
          : [],
      mealPlanDiff: [
        {
          op: "add",
          path: "/rules/focus_habit",
          value: focusHabits[profileWeek % focusHabits.length],
        },
      ],
      rationale: {
        training: "Training adjustments based on reported weekly difficulty.",
        nutrition: "Nutrition strategy tuned around adherence and consistency.",
        coordination: "Unified recommendation balancing recovery and adherence.",
      },
    };

    rows.push({
      user_id: userId,
      specialization: "nutrition",
      thread_id: nutritionThreadId,
      coach_profile_id: nutritionCoachProfileId,
      week_start: toIsoDate(weekStartDate),
      week_end: toIsoDate(weekEndDate),
      energy,
      adherence_percent: adherence,
      blockers,
      checkin_json: checkinJson,
      adherence_score: computedAdherenceScore,
      workout_plan_version: null,
      nutrition_plan_version: null,
      adjustment_json: adjustmentJson,
      weight_snapshot: {
        unit: "lb",
        entries: 4 + (profileWeek % 3),
        startWeight,
        endWeight,
        delta,
        trend,
      },
      coach_summary: coachSummary,
      summary_model: "gpt-4o-mini",
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
    });
  }

  const { error: checkinsError } = await supabase
    .from("coach_weekly_checkins")
    .upsert(rows, { onConflict: "user_id,specialization,week_start" });
  if (checkinsError) throw checkinsError;
};

const RANDOM_FIRST_NAMES = [
  "Sasha",
  "Nolan",
  "Priya",
  "Evan",
  "Selena",
  "Marco",
  "Camila",
  "Owen",
];

const RANDOM_LAST_NAMES = [
  "Reed",
  "Harper",
  "Morris",
  "Lane",
  "Cole",
  "Bennett",
  "Manning",
  "Fisher",
];

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

const buildRandomPrivateSeedIdentity = () => {
  const first = randomFrom(RANDOM_FIRST_NAMES);
  const last = randomFrom(RANDOM_LAST_NAMES);
  const displayName = `${first} ${last}`;
  const suffix = Math.floor(100 + Math.random() * 900);
  const username = `${first}${last}${suffix}`.toLowerCase();

  return { displayName, username };
};

const seedUser = async ({
  supabase,
  timeZone,
  email,
  password,
  displayName,
  username,
  bio,
  accountVisibility,
  progressVisibility,
  socialEnabled,
  weighInShareVisibility,
  gymEventShareVisibility,
  postShareVisibility,
  goalType,
  startWeight,
  targetMin,
  targetMax,
  targetWeight,
  baseWeight,
  trendPerDay,
  gymSessionsTarget,
  seedPostCount,
  blockedGymSessionDates = [],
  membershipTier = "free",
  profilePhotoFileName = null,
}) => {
  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
      },
    });
  if (createError) throw createError;
  const userId = createData?.user?.id;
  if (!userId) throw new Error(`Failed to create seed user ${email}.`);

  const avatarPath = await uploadSeedProfilePhoto({
    supabase,
    userId,
    profilePhotoFileName,
  });

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    display_name: displayName,
    username,
    bio,
    avatar_path: avatarPath,
    avatar_updated_at: avatarPath ? new Date().toISOString() : null,
    membership_tier: membershipTier,
    preferred_unit: "lb",
    timezone: timeZone,
    account_visibility: accountVisibility,
    progress_visibility: progressVisibility,
    social_enabled: socialEnabled,
    weigh_in_share_visibility: weighInShareVisibility,
    gym_event_share_visibility: gymEventShareVisibility,
    post_share_visibility: postShareVisibility,
    auto_support_enabled: false,
    auto_support_consent_at: null,
  });
  if (profileError) throw profileError;

  const { error: goalError } = await supabase.from("goals").insert({
    user_id: userId,
    goal_type: goalType,
    target_min: goalType === "maintain" ? targetMin : null,
    target_max: goalType === "maintain" ? targetMax : null,
    target_weight: goalType === "maintain" ? null : targetWeight,
    start_weight: startWeight,
    is_active: true,
    ended_at: null,
  });
  if (goalError) throw goalError;

  const { error: routineError } = await supabase.from("routines").insert({
    user_id: userId,
    weigh_in_cadence: "daily",
    custom_cadence: null,
    reminder_time: "07:30",
    gym_proof_enabled: false,
    gym_name: null,
    gym_sessions_target: gymSessionsTarget,
  });
  if (routineError) throw routineError;

  const gymSessions = buildGymSessions({
    userId,
    timeZone,
    target: gymSessionsTarget,
    blockedSessionDates: blockedGymSessionDates,
  });
  if (gymSessions.length > 0) {
    const { error: gymSessionsError } = await supabase
      .from("gym_sessions")
      .insert(gymSessions);
    if (gymSessionsError) throw gymSessionsError;
  }

  const weighIns = buildWeighIns({
    userId,
    timeZone,
    days: 365,
    baseWeight,
    trendPerDay,
    variationSeed: username,
  });
  const { error: weighInsError } = await supabase
    .from("weigh_ins")
    .insert(weighIns);
  if (weighInsError) throw weighInsError;

  const activityEvents = buildActivityEvents({ userId, weighIns, gymSessions });
  if (activityEvents.length > 0) {
    const { error: activityEventsError } = await supabase
      .from("activity_events")
      .insert(activityEvents);
    if (activityEventsError) throw activityEventsError;
  }

  const postCount =
    typeof seedPostCount === "number" ? Math.max(0, seedPostCount) : 3 + Math.floor(Math.random() * 3);
  const posts = buildPosts({ userId, accountVisibility, count: postCount });
  if (posts.length > 0) {
    const { error: postsError } = await supabase.from("posts").insert(posts);
    if (postsError) throw postsError;
  }

  return { userId, email, password, displayName, username, membershipTier };
};

const getProjectRefFromUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
};

const main = async () => {
  loadEnv();

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL in environment.",
    );
  }

  const currentProjectRef = getProjectRefFromUrl(supabaseUrl);
  const expectedProjectRef =
    process.env.EXPECTED_SUPABASE_PROJECT_REF?.trim() || null;
  const blockedRefs = ["igidaqmxvnyjeghfvkxs"];

  if (expectedProjectRef && currentProjectRef !== expectedProjectRef) {
    throw new Error(
      `Seed safety check failed: expected project ref ${expectedProjectRef}, got ${currentProjectRef ?? "unknown"}.`,
    );
  }

  if (currentProjectRef && blockedRefs.includes(currentProjectRef)) {
    throw new Error(
      `Seed safety check failed: project ref ${currentProjectRef} is blocked for this clone.`,
    );
  }

  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Clearing existing users...");
  const deletedCount = await deleteAllUsers(supabase);
  console.log(`Deleted ${deletedCount} user(s).`);

  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  const todayLocal = formatLocalDate(new Date(), timeZone);

  console.log("Creating seed users...");
  const seeded = [];

  seeded.push(
    await seedUser({
      supabase,
      timeZone,
      email: "a@aol.com",
      password: "aaaaaa",
      displayName: "Ryan Bezman",
      username: "ryanbezman",
      bio: "Lifting daily.",
      accountVisibility: "public",
      progressVisibility: "public",
      socialEnabled: true,
      weighInShareVisibility: "public",
      gymEventShareVisibility: "public",
      postShareVisibility: "public",
      goalType: "maintain",
      startWeight: 205,
      targetMin: 200,
      targetMax: 210,
      targetWeight: null,
      baseWeight: 205,
      trendPerDay: 0,
      gymSessionsTarget: 4,
      seedPostCount: 15,
      blockedGymSessionDates: [todayLocal],
      membershipTier: "pro",
      profilePhotoFileName: "ryanbezman.PNG",
    }),
  );

  seeded.push(
    await seedUser({
      supabase,
      timeZone,
      email: "b@aol.com",
      password: "bbbbbb",
      displayName: "Terence Bezman",
      username: "terencebezman",
      bio: "Bulk mode.",
      accountVisibility: "public",
      progressVisibility: "public",
      socialEnabled: true,
      weighInShareVisibility: "public",
      gymEventShareVisibility: "public",
      postShareVisibility: "public",
      goalType: "gain",
      startWeight: 150,
      targetMin: null,
      targetMax: null,
      targetWeight: 170,
      baseWeight: 158,
      trendPerDay: 0.02,
      gymSessionsTarget: 4,
      membershipTier: "pro",
      profilePhotoFileName: "terencebezman.PNG",
    }),
  );

  seeded.push(
    await seedUser({
      supabase,
      timeZone,
      email: "c@aol.com",
      password: "cccccc",
      displayName: "Matthew Bezman",
      username: "matthewbezman",
      bio: "Cutting phase.",
      accountVisibility: "public",
      progressVisibility: "private",
      socialEnabled: true,
      weighInShareVisibility: "public",
      gymEventShareVisibility: "public",
      postShareVisibility: "public",
      goalType: "lose",
      startWeight: 225,
      targetMin: null,
      targetMax: null,
      targetWeight: 200,
      baseWeight: 212,
      trendPerDay: -0.02,
      gymSessionsTarget: 4,
      membershipTier: "free",
      profilePhotoFileName: "matthewbezman.PNG",
    }),
  );

  seeded.push(
    await seedUser({
      supabase,
      timeZone,
      email: "d@aol.com",
      password: "dddddd",
      displayName: "Chris Cafiso",
      username: "chriscafiso",
      bio: "Testing social flows.",
      accountVisibility: "public",
      progressVisibility: "public",
      socialEnabled: true,
      weighInShareVisibility: "public",
      gymEventShareVisibility: "public",
      postShareVisibility: "public",
      goalType: "maintain",
      startWeight: 189,
      targetMin: 184,
      targetMax: 191,
      targetWeight: null,
      baseWeight: 188,
      trendPerDay: 0.01,
      gymSessionsTarget: 3,
      seedPostCount: 4,
      membershipTier: "free",
      profilePhotoFileName: "chriscafiso.JPG",
    }),
  );

  const randomPrivateIdentity = buildRandomPrivateSeedIdentity();
  seeded.push(
    await seedUser({
      supabase,
      timeZone,
      email: "e@aol.com",
      password: "eeeeee",
      displayName: randomPrivateIdentity.displayName,
      username: randomPrivateIdentity.username,
      bio: "Private profile for QA.",
      accountVisibility: "private",
      progressVisibility: "private",
      socialEnabled: false,
      weighInShareVisibility: "private",
      gymEventShareVisibility: "private",
      postShareVisibility: "private",
      goalType: "lose",
      startWeight: 206,
      targetMin: null,
      targetMax: null,
      targetWeight: 192,
      baseWeight: 201,
      trendPerDay: -0.015,
      gymSessionsTarget: 2,
      seedPostCount: 3,
      membershipTier: "free",
    }),
  );

  const ryanSeed = seeded[0];
  await seedAccountANutritionCheckins({
    supabase,
    userId: ryanSeed.userId,
    timeZone,
  });

  const [ryan, terence, matthew] = seeded;
  const follows = [
    {
      follower_user_id: ryan.userId,
      followed_user_id: terence.userId,
      status: "accepted",
    },
    {
      follower_user_id: ryan.userId,
      followed_user_id: matthew.userId,
      status: "accepted",
    },
    {
      follower_user_id: terence.userId,
      followed_user_id: ryan.userId,
      status: "accepted",
    },
    {
      follower_user_id: matthew.userId,
      followed_user_id: ryan.userId,
      status: "pending",
    },
  ];
  const { error: followsError } = await supabase.from("follows").insert(follows);
  if (followsError) throw followsError;

  const closeFriends = [
    {
      user_id: ryan.userId,
      friend_user_id: terence.userId,
    },
    {
      user_id: terence.userId,
      friend_user_id: ryan.userId,
    },
  ];
  const { error: closeFriendsError } = await supabase
    .from("close_friends")
    .insert(closeFriends);
  if (closeFriendsError) throw closeFriendsError;

  console.log("Seed complete.");
  seeded.forEach((entry) => {
    console.log(`Login email: ${entry.email}`);
    console.log(`Password: ${entry.password}`);
    console.log(`Username: ${entry.username}`);
    console.log(`Membership tier: ${entry.membershipTier}`);
  });
};

main().catch((error) => {
  console.error("Seed failed:", error?.message ?? error);
  process.exit(1);
});
