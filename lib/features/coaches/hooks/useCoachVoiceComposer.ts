import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { resolveCoachVoiceProfile } from "../models/voiceProfile";
import { synthesizeCoachSpeech, transcribeCoachAudio } from "../services/voiceClient";
import type { ActiveCoach } from "../types/types";
import type { ChatMessage } from "../types/workspaceTypes";

type VoiceComposerInputMode = "text" | "voice";

type UseCoachVoiceComposerOptions = {
  coach: ActiveCoach | null;
  enabled: boolean;
  assistantBusy: boolean;
  messages: ChatMessage[];
  initialInputMode?: VoiceComposerInputMode;
  onSendTranscript: (transcript: string) => Promise<void> | void;
  onClearSendError?: () => void;
};

type UseCoachVoiceComposerResult = {
  inputMode: VoiceComposerInputMode;
  setInputMode: (next: VoiceComposerInputMode) => void;
  voiceBusy: boolean;
  voiceRecording: boolean;
  voiceError: string | null;
  startVoiceRecording: () => Promise<void>;
  stopVoiceRecordingAndSend: () => Promise<void>;
};

export function useCoachVoiceComposer({
  coach,
  enabled,
  assistantBusy,
  messages,
  initialInputMode = "text",
  onSendTranscript,
  onClearSendError,
}: UseCoachVoiceComposerOptions): UseCoachVoiceComposerResult {
  const [inputMode, setInputMode] = useState<VoiceComposerInputMode>(initialInputMode);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const playbackSoundRef = useRef<Audio.Sound | null>(null);
  const playbackFileRef = useRef<string | null>(null);
  const playbackRequestRef = useRef(0);
  const initializedMessageSyncRef = useRef(false);
  const lastSpokenAssistantIdRef = useRef<string | null>(null);

  const configureAudioForPlayback = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const configureAudioForRecording = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const releasePlayback = useCallback(async () => {
    const sound = playbackSoundRef.current;
    playbackSoundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // Ignore stop failures during cleanup.
      }
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore unload failures during cleanup.
      }
    }

    const playbackFileUri = playbackFileRef.current;
    playbackFileRef.current = null;
    if (!playbackFileUri) return;

    try {
      await FileSystem.deleteAsync(playbackFileUri, { idempotent: true });
    } catch {
      // Ignore temporary file cleanup failures.
    }
  }, []);

  const releaseRecording = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Ignore stop failures during cleanup.
    }
  }, []);

  const speakAssistantReply = useCallback(
    async (text: string) => {
      if (!coach || !enabled || !text.trim().length) return;

      const nextRequestId = playbackRequestRef.current + 1;
      playbackRequestRef.current = nextRequestId;

      setVoiceError(null);
      setVoiceBusy(true);

      try {
        await releasePlayback();
        await configureAudioForPlayback();

        const voiceProfile = resolveCoachVoiceProfile(coach);
        const synthesis = await synthesizeCoachSpeech({
          text: text.trim(),
          voice: voiceProfile.voice,
          voiceInstructions: voiceProfile.instructions,
        });

        if (!synthesis.audio_base64) {
          throw new Error("Coach audio was empty.");
        }

        if (playbackRequestRef.current !== nextRequestId) {
          return;
        }

        const baseCacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
        if (!baseCacheDir) {
          throw new Error("Couldn't access local cache for audio playback.");
        }

        const fileUri = `${baseCacheDir}coach-voice-${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, synthesis.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        playbackFileRef.current = fileUri;

        const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
        playbackSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            if ("error" in status && status.error) {
              setVoiceError(status.error);
              setVoiceBusy(false);
            }
            return;
          }
          if (!status.didJustFinish) return;
          if (playbackSoundRef.current !== sound) return;
          playbackSoundRef.current = null;
          setVoiceBusy(false);
          void sound.unloadAsync();

          if (playbackFileRef.current === fileUri) {
            void FileSystem.deleteAsync(fileUri, { idempotent: true });
            playbackFileRef.current = null;
          }
        });
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : String(error));
        setVoiceBusy(false);
      }
    },
    [coach, configureAudioForPlayback, enabled, releasePlayback]
  );

  useEffect(() => {
    void configureAudioForPlayback();
    return () => {
      void releaseRecording();
      void releasePlayback();
    };
  }, [configureAudioForPlayback, releasePlayback, releaseRecording]);

  useEffect(() => {
    if (inputMode === "voice") return;

    setVoiceBusy(false);
    setVoiceError(null);
    void releasePlayback();
    if (voiceRecording) {
      setVoiceRecording(false);
      void releaseRecording();
    }
    void configureAudioForPlayback();
  }, [configureAudioForPlayback, inputMode, releasePlayback, releaseRecording, voiceRecording]);

  useEffect(() => {
    const lastAssistantMessage =
      [...messages].reverse().find((message) => message.role === "assistant") ?? null;
    if (!lastAssistantMessage) return;

    if (!initializedMessageSyncRef.current) {
      initializedMessageSyncRef.current = true;
      lastSpokenAssistantIdRef.current = lastAssistantMessage.id;
      return;
    }

    if (inputMode !== "voice") return;
    if (lastSpokenAssistantIdRef.current === lastAssistantMessage.id) return;
    lastSpokenAssistantIdRef.current = lastAssistantMessage.id;
    void speakAssistantReply(lastAssistantMessage.content);
  }, [inputMode, messages, speakAssistantReply]);

  const startVoiceRecording = useCallback(async () => {
    if (!enabled || !coach) return;
    if (assistantBusy || voiceBusy || voiceRecording) return;

    setVoiceError(null);
    onClearSendError?.();

    try {
      await releasePlayback();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceError("Microphone permission is required for voice chat.");
        return;
      }

      await configureAudioForRecording();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setVoiceRecording(true);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : String(error));
      setVoiceRecording(false);
      recordingRef.current = null;
      void configureAudioForPlayback();
    }
  }, [
    assistantBusy,
    coach,
    configureAudioForPlayback,
    configureAudioForRecording,
    enabled,
    onClearSendError,
    releasePlayback,
    voiceBusy,
    voiceRecording,
  ]);

  const stopVoiceRecordingAndSend = useCallback(async () => {
    if (!voiceRecording) return;

    setVoiceError(null);
    setVoiceBusy(true);
    setVoiceRecording(false);

    const recording = recordingRef.current;
    recordingRef.current = null;

    try {
      if (!recording) {
        throw new Error("No active recording found.");
      }

      await recording.stopAndUnloadAsync();
      await configureAudioForPlayback();

      const recordingUri = recording.getURI();
      if (!recordingUri) {
        throw new Error("Couldn't read your voice recording.");
      }

      const audioBase64 = await FileSystem.readAsStringAsync(recordingUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!audioBase64.trim().length) {
        throw new Error("Couldn't load your voice recording.");
      }
      void FileSystem.deleteAsync(recordingUri, { idempotent: true });

      const transcription = await transcribeCoachAudio({
        audioBase64,
        mimeType: "audio/m4a",
        language: "en",
      });
      const transcript = transcription.text.trim();
      if (!transcript.length) {
        setVoiceError("I couldn't hear speech in that recording. Please try again.");
        setVoiceBusy(false);
        return;
      }

      setVoiceBusy(false);
      await onSendTranscript(transcript);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : String(error));
      setVoiceBusy(false);
      void configureAudioForPlayback();
    }
  }, [configureAudioForPlayback, onSendTranscript, voiceRecording]);

  return {
    inputMode,
    setInputMode,
    voiceBusy,
    voiceRecording,
    voiceError,
    startVoiceRecording,
    stopVoiceRecordingAndSend,
  };
}
