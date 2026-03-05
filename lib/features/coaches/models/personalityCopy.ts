import type { CoachPersonality } from "../types";

export type CoachPersonalityCopy = {
  label: string;
  hint: string;
  aboutTeaser: string;
  aboutLine: string;
  whatYouGet: string[];
};

export const coachPersonalityCopy: Record<CoachPersonality, CoachPersonalityCopy> = {
  strict: {
    label: "Strict",
    hint: "No excuses, clear rules",
    aboutTeaser: "Clear rules. Clear targets.",
    aboutLine: "Direct coaching, clear rules, zero ambiguity.",
    whatYouGet: [
      "Clear targets and non-negotiables.",
      "No busywork. Do the work that matters.",
      "Accountability that doesn’t let you slide.",
    ],
  },
  sweet: {
    label: "Sweet",
    hint: "Supportive and kind",
    aboutTeaser: "Supportive structure that sticks.",
    aboutLine: "Supportive coaching that keeps you consistent without shame.",
    whatYouGet: [
      "Support with structure, not pressure.",
      "Progress over perfection.",
      "Gentle accountability that keeps you moving.",
    ],
  },
  relaxed: {
    label: "Relaxed",
    hint: "Low pressure, sustainable",
    aboutTeaser: "Low-pressure consistency.",
    aboutLine: "Low-pressure coaching built for sustainability.",
    whatYouGet: [
      "Low-friction routines you’ll actually stick to.",
      "Consistency-first choices.",
      "Calm adjustments that reduce burnout risk.",
    ],
  },
  bubbly: {
    label: "Bubbly",
    hint: "Cheerful, positive momentum",
    aboutTeaser: "Positive momentum, steady progress.",
    aboutLine: "Positive energy and momentum, even on off days.",
    whatYouGet: [
      "Positive momentum, even on off days.",
      "Celebrating small wins without losing structure.",
      "A plan that feels friendly, not clinical.",
    ],
  },
  hype: {
    label: "Hype",
    hint: "High energy, push harder",
    aboutTeaser: "Fast feedback, big momentum.",
    aboutLine: "High energy coaching focused on action and follow-through.",
    whatYouGet: [
      "Fast feedback and quick wins.",
      "Action steps that keep you moving today.",
      "High-energy accountability when motivation dips.",
    ],
  },
  analyst: {
    label: "Analyst",
    hint: "Data-driven, structured",
    aboutTeaser: "Data-driven tweaks with clear explanations.",
    aboutLine: "Data-driven coaching with clear explanations and tweaks that compound.",
    whatYouGet: [
      "A plan with the why behind each choice.",
      "Simple check-ins: what worked, what didn’t.",
      "Adjustments based on trends, not vibes.",
    ],
  },
};

