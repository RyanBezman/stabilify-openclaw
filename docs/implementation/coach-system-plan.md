# Coach System Implementation Plan (One Coach + Dashboard + Weekly Check-ins)

Last updated: 2026-03-10

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
- Dashboard uses a wider centered coach shell aligned with `CoachWorkspace`, while remaining constrained on large screens instead of stretching edge-to-edge.
- Header row shows `Coach Dashboard` with the unified coach avatar while dashboard body content loads.
- Chat entry is a floating `Chat with Coach` CTA anchored above the tab bar so it remains accessible without crowding the header.
- `Today` appears first and serves as the primary daily execution surface.
- Today is rendered as a full-width header band that feels visually distinct from the card stack below it, without framed top/bottom borders.
- Today shows workout status and macros as the only two content blocks.
- Today uses a compact summary presentation instead of expanded table-style detail rows.
- Macro content stays compressed into one concise summary line inside the Today snapshot.
- One full-width `Plans` section sits directly under `Today` and groups the paired `Training` and `Nutrition` cards.
- `Training` card.
- Presents as a compact entry tile without extra summary copy at the bottom.
- `Nutrition` card.
- Presents as a compact entry tile without extra summary copy at the bottom.
- Training/Nutrition cards do not render long inline CTA sentences; tap affordance is a compact violet `Open` badge with a stronger card accent instead of a trailing chevron.
- Training/Nutrition cards use explicit state chips (for example `Setup needed`, `Pending approval`) instead of percentage plan-status bars.
- Track cards remain a persistent dashboard section even when both plans are healthy/current.
- Lower-priority progress/accountability content is grouped under a single `This week` section.
- `This week` shows adherence and 8-week completion rings, streak, nutrition target, and a nested `Weekly check-in` status card.
- `Weekly check-in` shows next due date (`Sunday` in user timezone), latest adherence, weekly status rows, and CTA text `Do weekly check-in` when due or `Preview last check-in` otherwise.

### Weekly check-in flow (3-5 min)
- `CoachCheckins` keeps overview/history as the entry state and only opens the active form inside a dedicated wizard mode.
- Weekly check-in wizard reuses the onboarding step chrome: progress bar, step count, hero copy, animated step transitions, and bottom CTA bar.
- Wizard step order:
  - `body_metrics`
  - `training_recap`
  - `nutrition_recap`
  - `recovery`
  - `next_week`
  - `pain_safety`
  - `review`
- Review step shows a completed read-only form layout with editable sections and is the only place the final submit action appears.
- Overview mode never renders the full check-in field set all at once.
- Input set includes: current weight, optional waist/measurement/photo prompt, goal progress, training difficulty (`too_easy|right|too_hard`), nutrition adherence (percent or subjective), appetite/cravings, stomach/digestion notes, energy (1-5), recovery (1-5), sleep average hours and quality (1-5), stress (1-5), upcoming schedule constraints, injury/pain screen.
- New weekly check-ins do not prefill typed text/number responses; they use example placeholders instead.
- Wizard multiline fields scroll above the keyboard while focused so the active answer remains visible.
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
- Coach onboarding body profile includes explicit `sex` selection (`male | female | other`) plus defaulted height/weight values (`5'5"`, `170 lb`) that are valid without manual picker movement.
- On iPhone, the coach onboarding height and weight wheel pickers emit light selection haptics as the value changes.
- Coach onboarding height and weight wheels stay visually narrow and centered so the native selected lane reads like a spinner wheel instead of a full-width highlighted row.
- Coach onboarding top chrome includes a dedicated close action that exits back to the Coaches surface. If the draft differs from the entry state, exiting requires a discard confirmation instead of repeated back taps.
- Onboarding submission writes `coach_user_profiles`, sets unified persona selection, and triggers initial workout + nutrition plan generation via `coach-chat` (`plan_generate`).
- Onboarding must persist `coach_user_profiles.profile_json` before saving the unified coach selection. A profile-write failure cannot leave the server pointing at a newly selected coach while the client still treats onboarding as failed.
- Onboarding generation is commit-first for the saved coach/profile state: if one or both requested tracks fail to generate, onboarding still completes, returns explicit per-track generated state, and routes into `CoachOnboardingResults` with a warning instead of leaving client state behind server state.
- `CoachOnboardingResults` is the post-submit review surface that shows both Training + Nutrition outcomes and routes into per-track plan views/intake.
- `CoachOnboardingResults` reads explicit per-track generated booleans from the onboarding workflow result instead of assuming the requested `planStart` fully succeeded.
- `CoachOnboardingResults` snapshot hydration must prefer generated nutrition results when available, but fall back to workout snapshot loading when nutrition is unavailable so a partial success never renders as a full-screen error.
- `CoachWorkspace` is now the canonical plan + chat surface.
- `CoachWorkspace` plan surfaces default all `Show` / `Hide` sections to collapsed after initial plan hydrate or plan generation. User-opened sections must stay stable across refreshes when the displayed plan content is unchanged, and only reset to collapsed when the displayed plan actually changes.
- `CoachWorkspace` and `CoachProfile` resolve the selected coach from live `CoachContext` state once hydration settles. `CoachWorkspace` may temporarily use an explicit route coach during initial entry or explicit intake/draft launch so the shell can load immediately, but stale route params must never override the hydrated active selection.
- `CoachCheckins` now runs as an overview + wizard split: overview holds history/current-week preview; wizard handles the active weekly check-in steps and review.
- `CoachChat` is a compatibility shim that redirects to `CoachWorkspace` with `tab: "chat"` and carries `prefill`.
- Coach switching is a three-path flow whenever a saved coaching profile already exists:
  - `Keep current setup`: update unified coach identity, preserve accepted plan state and intake, clear chat thread and draft state.
  - `Rebuild from current setup`: open `CoachOnboardingFlow` prefilled from `coach_user_profiles.profile_json`, jump to review, and regenerate drafts.
  - `Edit setup first`: open `CoachOnboardingFlow` prefilled from `coach_user_profiles.profile_json` at the first editable step.
- Coach removal clears the active unified coach selection but intentionally preserves saved plan/intake state locally so a later `Keep current setup` selection can reattach without forcing onboarding.
- Coach removal must clear workout + nutrition selection as one logical unit. If one server-side clear fails after the other succeeds, the previous unified selection must be restored before the error is surfaced so the server never remains half-cleared.
- `Keep current setup` must preserve server-side thread state too: copy the accepted active plan and thread intake onto the newly selected coach thread, clear draft plans on both source/target threads, and clear target-thread chat history so the next workspace hydrate and future chat revisions stay aligned.
- `Keep current setup` must only run destructive server-side preserve mutations after the unified coach selection has been saved successfully. If preserve fails after the switch, the client attempts to restore the previous active-coach selection before surfacing the error.
- Unified coach linking must clear any stale nutrition selection if the workout half saves but the nutrition half fails. A warning state cannot leave an old nutrition coach attached on the server.
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
  sex: "male" | "female" | "other";
  equipmentAccess: "full_gym" | "home_basic" | "dumbbells" | "bodyweight";
  dietaryPreferences: string[];
  dietaryRestrictions: string[];
  injuriesLimitations: string[];
  scheduleConstraints: {
    trainingDaysPerWeek: number;
    sessionMinutes: 30 | 45 | 60 | 75 | 90;
    notes?: string;
  };
  trainingNotes?: string;
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
- Durable local cache: SQLite coach workspace cache is keyed by authenticated user id and must never hydrate coach identity, plans, intake, or messages across accounts on the same device. Legacy unscoped cache must be discarded during migration instead of being reassigned to the current user.
- Detaching an active coach must preserve accepted plan/intake cache when explicitly requested by the remove/switch flow, while still clearing active coach identity, chat messages, and draft state so stale chat does not appear under a new persona.
- Ephemeral in-memory cache: weekly check-in hook payload caches must also be keyed by authenticated user id in addition to coach persona so same-coach accounts on one device never inherit another account's history, current check-in, or derived form state.
- Background coach workspace prefetches must only seed local cache if the same auth user and same active coach are still current when the async fetch resolves; stale prefetch results from a previous coach selection must be dropped.
- Mounted coach workspace state must be invalidated on coach identity changes before the next hydrate runs; prior coach thread ids, plans, messages, and draft state cannot stay mounted while a new same-specialization coach loads.
- Mounted workspace mutations must also be session-scoped. If a coach switch happens while chat, plan generation, draft promotion, or draft discard requests are in flight, late results from the previous coach must be ignored instead of rehydrating stale plan/chat state into the new coach session.
- Coach sync events must be scoped by authenticated user id and coach identity. Weekly check-in listeners must also rewrite their in-memory cache when a nutrition draft is resolved so pending-review state cannot reappear after remount.
- Coach dashboard listeners must key sync events to the rendered surface specialization, not the raw specialization on an arbitrary passed coach object. The shared Coaches dashboard is nutrition-driven, so it must subscribe to the nutrition coach identity even when the UI also has a workout coach selected.
- Coach chat/check-in retry repairs must stay pinned to the auth user that started the request; they must never re-resolve the current session mid-retry and mutate a different account's coach selection.
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
