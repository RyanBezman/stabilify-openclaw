# Coach System Implementation Plan (One Coach + Dashboard + Weekly Check-ins)

Last updated: 2026-03-04

## Goal
- This file is implementation-focused: architecture, contracts, persistence, workflows, and testing.

## Policy Rules
- Product policy source-of-truth:
  - `docs/product/pro-coaching-and-safety.md`
  - `docs/product/product-foundation.md`
  - `docs/product/roadmap-and-governance.md`

### UX Rules (Derived from Product Policy)

### Navigation and naming
- Coaches tab remains the entry surface for coaching and becomes the primary Coach Dashboard.
- User-facing track labels are `Training` and `Nutrition`.
- Internal track keys stay `workout` and `nutrition` for compatibility.
- Chat entry is a single `Chat with Coach` CTA; no visible split chat by track.
- Only `Weekly Check-in` naming is used; no daily check-in terms in coach UI copy.

### Dashboard layout
- Top `Today` card.
- Today directive text is 1-2 sentences in unified coach voice.
- Today card shows 2-4 status pills: scheduled workout, macro progress, hydration reminder, recovery note.
- Today card primary CTA is `Chat with Coach`.
- `Training` card.
- Shows next session preview (example: `Upper A - 45 min`).
- CTA: `Start workout` if session exists, else `View plan`.
- `Nutrition` card.
- Shows calories/macros target and daily progress summary.
- CTA priority: `Log meal`, `View meal plan`, `Adjust targets`.
- `Weekly Check-in` card.
- Shows next due date (`Sunday` in user timezone).
- Shows streak and adherence score.
- CTA is `Do weekly check-in` when due; otherwise `Preview last check-in`.

### Weekly check-in flow (3-5 min)
- Input set includes: current weight, optional waist/measurement/photo prompt, goal progress, training difficulty (`too_easy|right|too_hard`), nutrition adherence (percent or subjective), appetite/cravings, energy (1-5), recovery (1-5), sleep average hours and quality (1-5), stress (1-5), upcoming schedule constraints, injury/pain screen.
- Output set includes: adjusted `WorkoutPlan` when needed, adjusted `NutritionTargets` and optional `MealPlan` when needed, 1-3 focus habits, short motivational summary in unified voice.

### Architecture Spec (One identity, Two specialists, Coordinator)

### Runtime layers
- UI Layer: React Native screens/hooks/components render deterministic artifacts.
- App Service Layer: typed clients call one orchestration endpoint and map artifact payloads.
- Coordinator Layer: receives chat/check-in intents, routes to specialist logic, reconciles contradictions, returns one `CoachMessage`.
- Specialist Layer: training specialist and nutrition specialist each generate structured diffs/artifacts.
- LLM Adapter Layer: provider-agnostic interface, OpenAI implementation behind it.

### Coordinator responsibilities
- Route check-in payload to one or both specialists.
- Merge specialist output into a single coherent `CoachMessage`.
- Enforce consistency rules before persisting.
- Persist adjustments and create new plan versions.
- Return artifact references for deterministic UI rendering.

### Provider-agnostic contract
- Introduce `LlmClient` interface in edge function modules and keep OpenAI-specific fetch logic in one adapter.
- Keep schema-first structured outputs so changing providers does not change frontend contracts.

### Current app implementation notes
- `CoachOnboardingFlow` is the required pre-workspace intake surface for Pro users missing `coach_user_profiles.profile_json` required fields.
- Onboarding submission writes `coach_user_profiles`, sets unified persona selection, and triggers initial workout + nutrition plan generation via `coach-chat` (`plan_generate`).
- `CoachWorkspace` is now the canonical plan + chat surface.
- `CoachChat` is a compatibility shim that redirects to `CoachWorkspace` with `tab: "chat"` and carries `prefill`.
- Voice recording/transcription/synthesis orchestration is consolidated in `lib/features/coaches/hooks/useCoachVoiceComposer.ts` and consumed by workspace chat pane.
- Coach UI decomposition is anchored under:
  - `components/coaches/workspace/*`
  - `components/coaches/checkins/*`

## Data Contracts

### Type additions in app layer
- Add new artifact contracts in `lib/features/coaches/types/artifacts.ts`.
- Re-export from `lib/features/coaches/types/index.ts` and `lib/features/coaches/index.ts`.
- Keep existing `CoachSpecialization = "workout" | "nutrition"` for compatibility.
- Add UI label mapper utility (`workout -> Training`, `nutrition -> Nutrition`).

```ts
export type UserProfile = {
  userId: string;
  goals: {
    primary: "fat_loss" | "muscle_gain" | "recomp" | "performance" | "maintain";
    targetRatePctPerWeek?: number | null;
    targetDate?: string | null;
  };
  experienceLevel: "beginner" | "intermediate" | "advanced";
  heightCm: number;
  weightKg: number;
  age: number;
  sex: "male" | "female";
  equipmentAccess: "full_gym" | "home_basic" | "dumbbells" | "bodyweight";
  dietaryPreferences: string[];
  dietaryRestrictions: string[];
  injuriesLimitations: string[];
  scheduleConstraints: {
    trainingDaysPerWeek: number;
    sessionMinutes: 30 | 45 | 60 | 75 | 90;
    notes?: string;
  };
  updatedAt: string;
};

export type WorkoutPlan = {
  id: string;
  version: number;
  cycleLengthWeeks: number;
  weeks: Array<{
    weekNumber: number;
    days: Array<{
      dayLabel: string;
      focus: string;
      estimatedMinutes: number;
      exercises: Array<{
        name: string;
        sets: number;
        reps: { min: number; max: number };
        rpe?: number | null;
        intensityPercent1RM?: number | null;
        restSeconds: number;
      }>;
    }>;
  }>;
  progressionNotes: string[];
  substitutions: Array<{
    originalExercise: string;
    substituteExercise: string;
    reason: string;
  }>;
};

export type NutritionTargets = {
  id: string;
  version: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  notesRules: string[];
};

export type MealPlan = {
  id: string;
  version: number;
  days: Array<{
    dayLabel: string;
    meals: Array<{
      mealName: string;
      foods: Array<{
        name: string;
        serving: string;
        estCalories: number;
        estProteinG: number;
        estCarbsG: number;
        estFatG: number;
      }>;
    }>;
  }>;
  groceryList?: string[] | null;
};

export type WeeklyCheckin = {
  id: string;
  timestamp: string;
  linkedPlanVersion: {
    workoutVersion: number | null;
    nutritionVersion: number | null;
  };
  currentWeightKg: number;
  waistCm?: number | null;
  progressPhotoPrompted: boolean;
  strengthPRs: string;
  consistencyNotes: string;
  bodyCompChanges: string;
  trainingDifficulty: "too_easy" | "right" | "too_hard";
  nutritionAdherencePercent?: number | null;
  nutritionAdherenceSubjective?: "low" | "medium" | "high" | null;
  appetiteCravings: string;
  energyRating: 1 | 2 | 3 | 4 | 5;
  recoveryRating: 1 | 2 | 3 | 4 | 5;
  sleepAvgHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  scheduleConstraintsNextWeek: string;
  injuryPain: {
    hasPain: boolean;
    details: string;
    redFlags: boolean;
  };
  computedAdherenceScore: number;
};

export type AdjustmentRecommendations = {
  id: string;
  workoutDiff: Array<{ op: "add" | "remove" | "replace"; path: string; value?: unknown }>;
  nutritionDiff: Array<{ op: "add" | "remove" | "replace"; path: string; value?: unknown }>;
  mealPlanDiff: Array<{ op: "add" | "remove" | "replace"; path: string; value?: unknown }>;
  rationale: {
    training: string;
    nutrition: string;
    coordination: string;
  };
};

export type CoachMessage = {
  id: string;
  voice: "unified_primary_coach";
  summary: string;
  focusHabits: [string] | [string, string] | [string, string, string];
  artifactRefs: {
    workoutPlanId?: string;
    nutritionTargetsId?: string;
    mealPlanId?: string;
    adjustmentRecommendationId?: string;
    weeklyCheckinId?: string;
  };
  createdAt: string;
};
```

### Persistence Plan (Durable, Versioned, Transient)

### DB changes (Supabase migrations)
| Area | Change |
|---|---|
| Coach profile artifact | Add `public.coach_user_profiles (user_id pk, profile_json jsonb, updated_at)` |
| Plan versioning | Alter `public.coach_plans`: add `version int`, `supersedes_plan_id uuid`, extend status enum with `superseded` |
| Nutrition artifact split | Store `NutritionTargets` plus optional `MealPlan` inside `plan_json` with strict schema keys |
| Weekly check-in | Alter `public.coach_weekly_checkins`: add `checkin_json jsonb`, `adherence_score`, `workout_plan_version`, `nutrition_plan_version`, `adjustment_json` |
| Indices | Add indexes for `(user_id, week_start desc)` and `(user_id, specialization, version desc)` |
| Backward compatibility | Keep existing columns used by current app; write both old and new payloads during transition window |

### State classification
- Durable DB state: active coach identity, coach user profile artifact, plan versions, weekly check-ins, adjustment recommendations, coach messages.
- Versioned state: workout plan versions, nutrition target versions, optional meal plan versions, linked version refs on each check-in.
- Transient state: chat draft text, in-flight coordinator reasoning, short prompt context window, UI-only form partials.

## UX States

### Guardrails and Consistency Rules

### Training rules
- Limit weekly set-volume increase to max 10% unless user explicitly asks for aggressive progression.
- Apply injury-aware substitutions when pain is reported.
- If red-flag pain is detected, return professional-consult recommendation and switch to conservative programming.

### Nutrition rules
- No medical diagnosis or treatment claims.
- Enforce calorie floor and no extreme deficits (default max deficit 20% estimated TDEE).
- Safe rate-of-loss guidance target 0.25%-1.0% bodyweight/week.
- If medical condition language appears, include professional-consult recommendation.

### Coordinator consistency rules
- Use a single shared `UserGoal` object for both tracks.
- Reconcile high training volume with deep calorie deficits before finalizing recommendations.
- If conflict persists, default to safety-first adjustment and explain rationale in internal logs and concise user summary.

### Milestones (Implementation Breakdown)

### 0) Documentation replacement
Files/modules:
- Maintain this implementation reference at `docs/implementation/coach-system-plan.md`.
Key functions/services:
- None.
Data flow:
- None.
Exit criteria:
- New doc exists and old doc removed.

### 1) Create schemas/types + DB tables
Files/modules:
- Add `lib/features/coaches/types/artifacts.ts`.
- Update `lib/features/coaches/types/index.ts`.
- Update `lib/features/coaches/index.ts`.
- Add migration `supabase/migrations/<timestamp>_coach_artifacts_foundation.sql`.
- Add edge schema module `supabase/functions/coach-chat/schemas.ts`.
Key functions/services:
- `validateUserProfileArtifact`, `validateWorkoutPlanArtifact`, `validateNutritionTargetsArtifact`, `validateWeeklyCheckinArtifact`.
Data flow:
- On onboarding/profile updates, app writes normalized `UserProfile` artifact; edge function reads artifact as source context.
Exit criteria:
- Artifact types compile and migration applies cleanly.

### 2) Implement plan versioning (WorkoutPlan + NutritionTargets)
Files/modules:
- Migration `supabase/migrations/<timestamp>_coach_plan_versioning.sql`.
- Add `supabase/functions/coach-chat/repositories/planVersions.ts`.
- Update `supabase/functions/coach-chat/index.ts`.
- Update `lib/features/coaches/services/chatClient.ts` response typing.
Key functions/services:
- `createDraftPlanVersion`, `promoteDraftPlanVersion`, `discardDraftPlanVersion`, `loadLatestPlanByType`.
Data flow:
- Generate/revise writes new draft version row; promote marks previous active as superseded and activates the new version.
Exit criteria:
- History of plan versions retained and active pointers stable.

### 3) Build Dashboard UI (Today, Training, Nutrition, Weekly Check-in cards)
Files/modules:
- Refactor `screens/Coaches.tsx` into dashboard root.
- Add `components/coaches/dashboard/CoachTodayCard.tsx`.
- Add `components/coaches/dashboard/TrackCard.tsx`.
- Add `components/coaches/dashboard/WeeklyCheckinCard.tsx`.
- Add `lib/features/coaches/hooks/useCoachDashboard.ts`.
- Add `lib/features/coaches/services/dashboard.ts`.
Key functions/services:
- `hydrateCoachDashboard`, `computeNextCheckinDueLabel`, `buildTodayStatusIndicators`.
Data flow:
- Screen -> hook -> dashboard service -> `coach-chat` action `dashboard_snapshot` -> deterministic card props.
Exit criteria:
- Dashboard cards and CTAs match required layout and naming.

### 4) Implement Weekly Check-in flow (form + validation + persistence)
Files/modules:
- Expand `screens/CoachCheckins.tsx` with full input set.
- Update `lib/features/coaches/types/checkinsTypes.ts`.
- Update `lib/features/coaches/hooks/useCoachCheckins.ts`.
- Update `lib/features/coaches/services/checkins.ts`.
- Update `lib/features/coaches/workflows/coachCheckinsWorkflow.ts`.
- Add migration `supabase/migrations/<timestamp>_coach_weekly_checkins_v2.sql`.
Key functions/services:
- `normalizeWeeklyCheckinInputV2`, `computeAdherenceScore`, `submitWeeklyCheckinV2`.
Data flow:
- Form -> local validation -> workflow submit -> edge persist -> returns check-in + adjustments + coach message -> UI renders artifacts.
Exit criteria:
- Weekly check-in takes 3-5 minutes and stores all required fields.

### 5) Build Coordinator logic for weekly adjustment generation
Files/modules:
- Add `supabase/functions/coach-chat/coordinator.ts`.
- Add `supabase/functions/coach-chat/tracks/trainingSpecialist.ts`.
- Add `supabase/functions/coach-chat/tracks/nutritionSpecialist.ts`.
- Add `supabase/functions/coach-chat/reconcile.ts`.
- Add `supabase/functions/coach-chat/guardrails.ts`.
Key functions/services:
- `routeCheckinToTracks`, `generateTrainingDiff`, `generateNutritionDiff`, `reconcileRecommendations`, `buildUnifiedCoachMessage`.
Data flow:
- Weekly check-in payload -> coordinator routing -> specialist diffs -> reconciliation -> plan version updates + unified message response.
Exit criteria:
- No contradictory training/nutrition recommendations in final payload.

### 6) Wire OpenAI calls for initial plans, weekly adjustments, unified CoachMessage
Files/modules:
- Add `supabase/functions/coach-chat/llmClient.ts`.
- Add `supabase/functions/coach-chat/openaiClient.ts`.
- Update `supabase/functions/coach-chat/index.ts` routing.
- Update `screens/CoachWorkspace.tsx` unified chat tab and plan surface composition.
- Keep `screens/CoachChat.tsx` as temporary redirect-only compatibility route.
Key functions/services:
- `generateInitialPlans`, `generateWeeklyAdjustments`, `sendUnifiedChatMessage`.
Data flow:
- Chat/plan/check-in actions call coordinator; coordinator calls LLM adapter; app receives structured artifacts + concise coach text.
Exit criteria:
- Initial plan generation and weekly adjustment generation both produce structured artifacts and a unified voice message.

### 7) Add analytics (streaks, completion rate, adherence tracking)
Files/modules:
- Add `lib/features/coaches/services/analytics.ts`.
- Extend `lib/features/coaches/hooks/useCoachDashboard.ts`.
- Update dashboard/check-in card components for analytics display.
Key functions/services:
- `computeWeeklyCheckinStreak`, `computeCompletionRate`, `computeAdherenceTrend`.
Data flow:
- Check-in history query -> analytics service computes metrics -> dashboard card displays streak and adherence.
Exit criteria:
- Weekly card reliably shows next due date, streak, and adherence score trend.

## QA

### Test Cases and Acceptance Scenarios

### Unit tests
- Artifact schema validators reject out-of-range values and missing required fields.
- Adherence score computation is deterministic and bounded 0-100.
- Coordinator conflict resolver adjusts contradictory training/nutrition outputs.
- Plan version transitions preserve history (`draft -> active -> superseded`) without collisions.

### Workflow/service tests
- `submitCoachCheckinWorkflow` returns unified artifacts and `CoachMessage`.
- `dashboard_snapshot` returns all four dashboard card payloads.
- Weekly due-state logic handles timezone boundaries and Sunday transitions correctly.
- No daily check-in labels appear in returned UI copy payloads.

### UI tests
- Coaches dashboard renders Today, Training, Nutrition, Weekly Check-in cards in required order.
- Track labels are exactly `Training` and `Nutrition`.
- Weekly check-in CTA switches between `Do weekly check-in` and `Preview last check-in` based on due state.
- Chat entry from dashboard always goes to shared chat surface.

### Regression checks
- Existing membership gating still works for coach surfaces.
- Existing plan screens continue to open from track cards.
- Existing `npm test` suite passes, plus new coach tests.
- Run `npm run lint:arch` and `npx tsc --noEmit` before merge.

## Analytics

- Maintain coach funnel instrumentation in `docs/analytics/event-registry.md`.
- Keep coordinator safety and acceptance-state events traceable in analytics metadata.

## Assumptions and Defaults
- Coaches tab root is the only v1 location for the new Coach Dashboard.
- User picks one coach persona once; both internal tracks stay synchronized to that identity.
- Internal keys remain `workout`/`nutrition`; user-facing copy uses `Training`/`Nutrition`.
- Weekly cycle is Monday-Sunday in user timezone; check-in due by Sunday end-of-day local time.
- Progress photo in v1 is a prompt/optional attachment reference, not full media workflow expansion.
- No daily check-ins in v1, including copy, APIs, analytics, and navigation labels.
