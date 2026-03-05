/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
// deno-lint-ignore-file
// @ts-nocheck — Supabase Edge Functions run in the Deno runtime; local TS may not resolve Deno globals.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type VoiceName = "alloy" | "echo" | "fable" | "nova" | "onyx" | "shimmer";
type Action = "transcribe" | "synthesize";

type RequestBody = {
  action?: Action;
  audio_base64?: string;
  mime_type?: string;
  language?: string;
  text?: string;
  voice?: string;
  voice_instructions?: string;
};

const allowedVoices = new Set<VoiceName>([
  "alloy",
  "echo",
  "fable",
  "nova",
  "onyx",
  "shimmer",
]);

const maxAudioBytes = 8 * 1024 * 1024; // 8 MB
const maxSynthesisChars = 1200;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function badRequest(message: string) {
  return json(400, { error: message });
}

function serverError(message: string) {
  return json(500, { error: message });
}

function forbidden(message: string, code?: string) {
  return json(403, { error: message, ...(code ? { code } : {}) });
}

function openAiNotConfigured() {
  return json(501, {
    error: "OpenAI is not configured. Add OPENAI_API_KEY to Supabase function secrets.",
    code: "OPENAI_NOT_CONFIGURED",
  });
}

async function readJson(req: Request): Promise<RequestBody> {
  try {
    const body = (await req.json()) as RequestBody;
    return body ?? {};
  } catch {
    return {};
  }
}

function normalizeMimeType(value: string | undefined) {
  if (!value?.trim()) return "audio/m4a";
  const next = value.trim().toLowerCase();
  if (!next.startsWith("audio/")) return "audio/m4a";
  return next;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("aac")) return "aac";
  return "m4a";
}

function decodeBase64ToBytes(value: string) {
  try {
    const normalized = value.replace(/\s+/g, "");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function encodeBytesToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function openAiError(resp: Response) {
  const detailsRaw = await resp.text();
  const details =
    detailsRaw.length > 900 ? `${detailsRaw.slice(0, 900)}...[truncated]` : detailsRaw;
  return json(502, {
    error: `OpenAI request failed (${resp.status}).`,
    details,
    code: "OPENAI_REQUEST_FAILED",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError("Missing Supabase env vars in function runtime.");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing Authorization bearer token." });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: userErr?.message ?? "Invalid session." });
  }

  const userId = userData.user.id;
  const { data: profile, error: profileErr } = await supabaseUser
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .maybeSingle<{ membership_tier?: string | null }>();
  if (profileErr) return serverError(profileErr.message);
  if (!profile || profile.membership_tier !== "pro") {
    return forbidden("Coach voice requires Pro.", "TIER_REQUIRES_PRO");
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return openAiNotConfigured();

  const body = await readJson(req);
  const action: Action = body.action === "transcribe" ? "transcribe" : "synthesize";

  if (action === "transcribe") {
    const audioBase64 = body.audio_base64?.trim() ?? "";
    if (!audioBase64) return badRequest("Missing audio payload.");

    const audioBytes = decodeBase64ToBytes(audioBase64);
    if (!audioBytes) return badRequest("Invalid audio base64 payload.");
    if (audioBytes.byteLength > maxAudioBytes) {
      return badRequest("Audio clip is too large. Keep recordings under 8 MB.");
    }

    const mimeType = normalizeMimeType(body.mime_type);
    const fileExt = extensionForMimeType(mimeType);
    const model = Deno.env.get("OPENAI_MODEL_TRANSCRIBE") ?? "gpt-4o-mini-transcribe";
    const language = body.language?.trim().slice(0, 16);

    const formData = new FormData();
    formData.append("file", new Blob([audioBytes], { type: mimeType }), `coach-input.${fileExt}`);
    formData.append("model", model);
    if (language) formData.append("language", language);

    const transcribeResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: formData,
    });

    if (!transcribeResp.ok) return openAiError(transcribeResp);

    const payload = await transcribeResp.json();
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text) {
      return json(422, {
        error: "No speech was detected in the audio clip.",
        code: "NO_SPEECH_DETECTED",
      });
    }

    return json(200, { text, model });
  }

  const text = body.text?.trim() ?? "";
  if (!text) return badRequest("Missing text.");
  if (text.length > maxSynthesisChars) {
    return badRequest(`Text is too long for speech synthesis (${maxSynthesisChars} chars max).`);
  }

  const voiceRaw = body.voice?.trim().toLowerCase() ?? "";
  if (!allowedVoices.has(voiceRaw as VoiceName)) {
    return badRequest("Unsupported voice id.");
  }
  const voice = voiceRaw as VoiceName;

  const voiceInstructions = body.voice_instructions?.trim();
  const model = Deno.env.get("OPENAI_MODEL_TTS") ?? "gpt-4o-mini-tts";
  const synthPayload: Record<string, unknown> = {
    model,
    voice,
    input: text,
    format: "mp3",
  };
  if (voiceInstructions) {
    synthPayload.instructions = voiceInstructions.slice(0, 280);
  }

  const synthResp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(synthPayload),
  });

  if (!synthResp.ok) return openAiError(synthResp);

  const audioBuffer = await synthResp.arrayBuffer();
  const audioBytes = new Uint8Array(audioBuffer);
  if (!audioBytes.length) {
    return serverError("Received empty audio from OpenAI.");
  }

  const audioBase64 = encodeBytesToBase64(audioBytes);
  return json(200, {
    audio_base64: audioBase64,
    format: "mp3",
    model,
    voice,
  });
});

