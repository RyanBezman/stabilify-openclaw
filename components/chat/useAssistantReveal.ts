import type { MutableRefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import type { ChatMessage } from "../../lib/features/coaches";

export default function useAssistantReveal({
  messages,
  historyLoading,
  isAtBottomRef,
  scrollToBottom,
  baseCps = 45,
}: {
  messages: ChatMessage[];
  historyLoading: boolean;
  isAtBottomRef: MutableRefObject<boolean>;
  scrollToBottom: (animated: boolean) => void;
  baseCps?: number;
}) {
  const seenAssistantIdsRef = useRef<Set<string>>(new Set());
  const revealRafRef = useRef<number | null>(null);
  const revealIdRef = useRef<string | null>(null);
  const revealTargetLenRef = useRef(0);
  const revealStartMsRef = useRef(0);
  const revealCpsRef = useRef(baseCps);
  const revealLastScrollMsRef = useRef(0);

  const [revealingMessageId, setRevealingMessageId] = useState<string | null>(null);
  const [revealedChars, setRevealedChars] = useState(0);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const stopReveal = useCallback(() => {
    if (revealRafRef.current != null) {
      cancelAnimationFrame(revealRafRef.current);
      revealRafRef.current = null;
    }
    revealIdRef.current = null;
    revealTargetLenRef.current = 0;
    revealStartMsRef.current = 0;
    revealLastScrollMsRef.current = 0;
    setRevealingMessageId(null);
  }, []);

  const finishReveal = useCallback(() => {
    stopReveal();
    requestAnimationFrame(() => scrollToBottom(true));
  }, [scrollToBottom, stopReveal]);

  const markAssistantSeen = useCallback((id: string) => {
    seenAssistantIdsRef.current.add(id);
  }, []);

  // Use a layout effect so the assistant message doesn't "flash" fully rendered
  // for a frame before we swap it to the sliced (revealing) content.
  useLayoutEffect(() => {
    if (historyLoading) return;
    if (!messages.length) return;

    // Find newest assistant message.
    let newestAssistant: ChatMessage | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        newestAssistant = messages[i];
        break;
      }
    }
    if (!newestAssistant?.content) return;

    // Don't stream already-known assistant messages (history/cache).
    if (seenAssistantIdsRef.current.has(newestAssistant.id)) return;
    seenAssistantIdsRef.current.add(newestAssistant.id);

    stopReveal();
    revealIdRef.current = newestAssistant.id;
    revealTargetLenRef.current = newestAssistant.content.length;
    revealStartMsRef.current = Date.now();
    revealLastScrollMsRef.current = 0;
    setRevealingMessageId(newestAssistant.id);
    setRevealedChars(0);

    const len = newestAssistant.content.length;
    revealCpsRef.current = baseCps + Math.min(18, Math.floor(len / 120));

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0.15, duration: 520, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      ])
    );
    blink.start();

    const tick = () => {
      if (!revealIdRef.current) return;
      const target = revealTargetLenRef.current;
      const elapsedMs = Date.now() - revealStartMsRef.current;
      const cps = revealCpsRef.current;
      const next = Math.min(target, Math.floor((elapsedMs * cps) / 1000));

      setRevealedChars((prev) => (next > prev ? next : prev));

      if (isAtBottomRef.current) {
        const now = Date.now();
        if (!revealLastScrollMsRef.current || now - revealLastScrollMsRef.current > 120) {
          revealLastScrollMsRef.current = now;
          scrollToBottom(false);
        }
      }

      if (next >= target) {
        blink.stop();
        stopReveal();
        return;
      }
      revealRafRef.current = requestAnimationFrame(tick);
    };

    revealRafRef.current = requestAnimationFrame(tick);

    return () => {
      blink.stop();
      stopReveal();
    };
  }, [baseCps, cursorOpacity, historyLoading, isAtBottomRef, messages, scrollToBottom, stopReveal]);

  return {
    revealingMessageId,
    revealedChars,
    cursorOpacity,
    finishReveal,
    markAssistantSeen,
  };
}
