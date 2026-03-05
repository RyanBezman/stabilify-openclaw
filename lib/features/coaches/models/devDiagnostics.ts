import { useEffect, useRef } from "react";

type DiagnosticDetails = Record<string, unknown>;

function formatDiagnosticDetails(details?: DiagnosticDetails) {
  if (!details) return "";

  const fragments = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);

  return fragments.join(" ");
}

function isDevEnvironment() {
  return typeof __DEV__ !== "undefined" ? __DEV__ : false;
}

function isCoachDiagnosticsEnabled() {
  const globalFlag = (globalThis as { __COACH_DIAGNOSTICS__?: unknown })
    .__COACH_DIAGNOSTICS__;
  if (typeof globalFlag === "boolean") return globalFlag;

  const envFlag =
    typeof process !== "undefined"
      ? process.env.EXPO_PUBLIC_COACH_DIAGNOSTICS
      : undefined;
  return envFlag === "1" || envFlag === "true";
}

export function useCoachRenderDiagnostics(scope: string, details?: DiagnosticDetails) {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (!isDevEnvironment() || !isCoachDiagnosticsEnabled()) return;

    const suffix = formatDiagnosticDetails(details);
    if (suffix.length) {
      console.debug(`[coach-dev] ${scope} render#${renderCountRef.current} ${suffix}`);
      return;
    }
    console.debug(`[coach-dev] ${scope} render#${renderCountRef.current}`);
  });
}

export function logCoachRequestDiagnostics(args: {
  scope: string;
  requestId: number | string;
  phase: "start" | "success" | "error" | "stale" | "skip";
  details?: DiagnosticDetails;
}) {
  if (!isDevEnvironment() || !isCoachDiagnosticsEnabled()) return;

  const suffix = formatDiagnosticDetails(args.details);
  const base = `[coach-dev] ${args.scope} req=${args.requestId} ${args.phase}`;
  if (suffix.length) {
    console.debug(`${base} ${suffix}`);
    return;
  }
  console.debug(base);
}
