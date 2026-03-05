import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach, ChatMessage } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const audioMocks = vi.hoisted(() => ({
  requestPermissionsAsync: vi.fn<() => Promise<{ granted: boolean }>>(),
  setAudioModeAsync: vi.fn<(mode: Record<string, boolean | number>) => Promise<void>>(),
  prepareToRecordAsync: vi.fn<() => Promise<void>>(),
  startAsync: vi.fn<() => Promise<void>>(),
  stopAndUnloadAsync: vi.fn<() => Promise<void>>(),
  createSoundAsync: vi.fn<
    (source: { uri: string }, options: { shouldPlay: boolean }) => Promise<{ sound: MockSound }>
  >(),
  recordingUri: "file://recording.m4a",
  playbackStatusHandler: null as ((status: PlaybackStatus) => void) | null,
}));

const fileSystemMocks = vi.hoisted(() => ({
  readAsStringAsync: vi.fn<() => Promise<string>>(),
  writeAsStringAsync: vi.fn<() => Promise<void>>(),
  deleteAsync: vi.fn<() => Promise<void>>(),
}));

const voiceClientMocks = vi.hoisted(() => ({
  transcribeCoachAudio: vi.fn<
    () => Promise<{
      text: string;
    }>
  >(),
  synthesizeCoachSpeech: vi.fn<
    () => Promise<{
      audio_base64: string | null;
    }>
  >(),
}));

type PlaybackStatus = {
  isLoaded: boolean;
  didJustFinish?: boolean;
  error?: string;
};

type MockSound = {
  stopAsync: () => Promise<void>;
  unloadAsync: () => Promise<void>;
  setOnPlaybackStatusUpdate: (handler: (status: PlaybackStatus) => void) => void;
};

vi.mock("expo-av", () => ({
  Audio: {
    Recording: class {
      async prepareToRecordAsync() {
        await audioMocks.prepareToRecordAsync();
      }

      async startAsync() {
        await audioMocks.startAsync();
      }

      async stopAndUnloadAsync() {
        await audioMocks.stopAndUnloadAsync();
      }

      getURI() {
        return audioMocks.recordingUri;
      }
    },
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
    requestPermissionsAsync: audioMocks.requestPermissionsAsync,
    setAudioModeAsync: audioMocks.setAudioModeAsync,
    Sound: {
      createAsync: audioMocks.createSoundAsync,
    },
  },
  InterruptionModeAndroid: {
    DuckOthers: 1,
  },
  InterruptionModeIOS: {
    DuckOthers: 1,
  },
}));

vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  documentDirectory: "file://document/",
  EncodingType: {
    Base64: "base64",
  },
  readAsStringAsync: fileSystemMocks.readAsStringAsync,
  writeAsStringAsync: fileSystemMocks.writeAsStringAsync,
  deleteAsync: fileSystemMocks.deleteAsync,
}));

vi.mock("../services/voiceClient", () => ({
  transcribeCoachAudio: voiceClientMocks.transcribeCoachAudio,
  synthesizeCoachSpeech: voiceClientMocks.synthesizeCoachSpeech,
}));

import { useCoachVoiceComposer } from "./useCoachVoiceComposer";

type HookValue = ReturnType<typeof useCoachVoiceComposer>;

type HookHarnessProps = {
  coach: ActiveCoach | null;
  enabled: boolean;
  assistantBusy: boolean;
  messages: ChatMessage[];
  initialInputMode?: "text" | "voice";
  onSendTranscript: (transcript: string) => Promise<void>;
  onClearSendError?: () => void;
};

function renderUseCoachVoiceComposer(props: HookHarnessProps) {
  let current: HookValue | null = null;

  function HookHarness(nextProps: HookHarnessProps) {
    current = useCoachVoiceComposer(nextProps);
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(HookHarness, props));
  });

  return {
    get current() {
      if (!current) throw new Error("Hook value not available.");
      return current;
    },
    update: (nextProps: HookHarnessProps) => {
      act(() => {
        renderer.update(React.createElement(HookHarness, nextProps));
      });
    },
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

async function flushAsyncWork(ticks = 4) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

const baseCoach: ActiveCoach = {
  specialization: "workout",
  gender: "woman",
  personality: "hype",
  displayName: "Nova",
  tagline: "High energy and direct",
};

describe("useCoachVoiceComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audioMocks.requestPermissionsAsync.mockResolvedValue({ granted: true });
    audioMocks.setAudioModeAsync.mockResolvedValue();
    audioMocks.prepareToRecordAsync.mockResolvedValue();
    audioMocks.startAsync.mockResolvedValue();
    audioMocks.stopAndUnloadAsync.mockResolvedValue();
    fileSystemMocks.readAsStringAsync.mockResolvedValue("base64-audio");
    fileSystemMocks.writeAsStringAsync.mockResolvedValue();
    fileSystemMocks.deleteAsync.mockResolvedValue();
    voiceClientMocks.transcribeCoachAudio.mockResolvedValue({ text: "Please lower my calories." });
    voiceClientMocks.synthesizeCoachSpeech.mockResolvedValue({ audio_base64: "base64-speech" });
    audioMocks.playbackStatusHandler = null;
    audioMocks.createSoundAsync.mockImplementation(async () => {
      const sound: MockSound = {
        stopAsync: async () => undefined,
        unloadAsync: async () => undefined,
        setOnPlaybackStatusUpdate: (handler) => {
          audioMocks.playbackStatusHandler = handler;
        },
      };
      return { sound };
    });
  });

  it("records, transcribes, and forwards transcript text", async () => {
    const onSendTranscript = vi.fn(async () => undefined);
    const hook = renderUseCoachVoiceComposer({
      coach: baseCoach,
      enabled: true,
      assistantBusy: false,
      messages: [],
      initialInputMode: "voice",
      onSendTranscript,
    });

    await act(async () => {
      await hook.current.startVoiceRecording();
    });
    expect(hook.current.voiceRecording).toBe(true);
    expect(audioMocks.requestPermissionsAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await hook.current.stopVoiceRecordingAndSend();
    });

    expect(voiceClientMocks.transcribeCoachAudio).toHaveBeenCalledTimes(1);
    expect(onSendTranscript).toHaveBeenCalledWith("Please lower my calories.");
    expect(hook.current.voiceRecording).toBe(false);
    expect(hook.current.voiceBusy).toBe(false);

    hook.unmount();
  });

  it("synthesizes and plays new assistant replies in voice mode", async () => {
    const onSendTranscript = vi.fn(async () => undefined);
    const initialMessages: ChatMessage[] = [
      { id: "assistant-1", role: "assistant", content: "Welcome back." },
    ];
    const hook = renderUseCoachVoiceComposer({
      coach: baseCoach,
      enabled: true,
      assistantBusy: false,
      messages: initialMessages,
      initialInputMode: "voice",
      onSendTranscript,
    });

    await flushAsyncWork();

    hook.update({
      coach: baseCoach,
      enabled: true,
      assistantBusy: false,
      messages: [...initialMessages, { id: "assistant-2", role: "assistant", content: "Here is your update." }],
      initialInputMode: "voice",
      onSendTranscript,
    });

    await flushAsyncWork();

    expect(voiceClientMocks.synthesizeCoachSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Here is your update." }),
    );
    expect(audioMocks.createSoundAsync).toHaveBeenCalledTimes(1);
    expect(audioMocks.playbackStatusHandler).not.toBeNull();

    if (!audioMocks.playbackStatusHandler) {
      throw new Error("Playback status handler was not set.");
    }
    act(() => {
      audioMocks.playbackStatusHandler?.({ isLoaded: true, didJustFinish: true });
    });
    expect(hook.current.voiceBusy).toBe(false);

    hook.unmount();
  });
});
