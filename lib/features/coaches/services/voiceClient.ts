import { supabase } from "../../../supabase";

type CoachVoiceError = Error & {
  status?: number;
  code?: string;
  details?: string;
};

type TranscribeCoachAudioInput = {
  audioBase64: string;
  mimeType?: string;
  language?: string;
};

type SynthesizeCoachSpeechInput = {
  text: string;
  voice: string;
  voiceInstructions?: string;
};

export type CoachAudioTranscriptionResponse = {
  text: string;
  model?: string;
};

export type CoachSpeechSynthesisResponse = {
  audio_base64: string;
  format: "mp3";
  model?: string;
  voice?: string;
};

function parseErrorCode(details: string): string | undefined {
  if (!details) return undefined;
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed?.code === "string" && parsed.code.trim().length > 0) {
      return parsed.code;
    }
  } catch {
    // Ignore malformed response payloads.
  }
  return undefined;
}

async function getAccessToken() {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw new Error(sessionErr.message ?? "Couldn't load session.");

  let session = sessionData?.session ?? null;
  if (!session?.access_token) {
    throw new Error("You're not signed in. Please sign out and sign back in.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt - now < 60) {
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) throw new Error(refreshErr.message ?? "Session refresh failed.");
    session = refreshed.session ?? session;
  }

  return session.access_token;
}

async function toCoachVoiceError(error: unknown): Promise<CoachVoiceError> {
  const invokeError = error as { message?: string; context?: unknown } | null;
  const ctx = invokeError?.context as
    | {
        status?: number;
        text?: () => Promise<string>;
      }
    | undefined;

  const status = typeof ctx?.status === "number" ? ctx.status : 0;
  let details = "";
  if (ctx && typeof ctx.text === "function") {
    try {
      details = (await ctx.text()) || "";
    } catch {
      // Ignore response body parse issues.
    }
  }

  const code = parseErrorCode(details);
  const message = `${invokeError?.message ?? "Request failed."}${status ? ` (HTTP ${status})` : ""}${details ? `\n${details}` : ""}`;
  const err = new Error(message) as CoachVoiceError;
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

async function invokeCoachVoice(body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const { data, error } = await supabase.functions.invoke("coach-voice", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    throw await toCoachVoiceError(error);
  }

  return data as Record<string, unknown>;
}

export async function transcribeCoachAudio(
  input: TranscribeCoachAudioInput
): Promise<CoachAudioTranscriptionResponse> {
  const data = await invokeCoachVoice({
    action: "transcribe",
    audio_base64: input.audioBase64,
    mime_type: input.mimeType,
    language: input.language,
  });

  return {
    text: typeof data.text === "string" ? data.text : "",
    model: typeof data.model === "string" ? data.model : undefined,
  };
}

export async function synthesizeCoachSpeech(
  input: SynthesizeCoachSpeechInput
): Promise<CoachSpeechSynthesisResponse> {
  const data = await invokeCoachVoice({
    action: "synthesize",
    text: input.text,
    voice: input.voice,
    voice_instructions: input.voiceInstructions,
  });

  return {
    audio_base64: typeof data.audio_base64 === "string" ? data.audio_base64 : "",
    format: "mp3",
    model: typeof data.model === "string" ? data.model : undefined,
    voice: typeof data.voice === "string" ? data.voice : undefined,
  };
}
