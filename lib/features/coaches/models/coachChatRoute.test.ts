import { describe, expect, it } from "vitest";
import { mapCoachChatRouteToWorkspaceParams } from "./coachChatRoute";
import type { RootStackParamList } from "../../../navigation/types";

describe("mapCoachChatRouteToWorkspaceParams", () => {
  it("maps explicit specialization and prefill to workspace chat params", () => {
    const params: RootStackParamList["CoachChat"] = {
      specialization: "nutrition",
      prefill: "Can we adjust calories?",
      coach: {
        gender: "woman",
        personality: "analyst",
        displayName: "Alex",
        specialization: "workout",
        tagline: "Structured and clear",
      },
    };

    expect(mapCoachChatRouteToWorkspaceParams(params)).toEqual({
      specialization: "nutrition",
      coach: params.coach,
      tab: "chat",
      prefill: "Can we adjust calories?",
      inputMode: "text",
    });
  });

  it("falls back from specialization to initialDomain to coach specialization to workout", () => {
    expect(
      mapCoachChatRouteToWorkspaceParams({
        initialDomain: "nutrition",
      }),
    ).toMatchObject({
      specialization: "nutrition",
      tab: "chat",
      inputMode: "text",
    });

    expect(
      mapCoachChatRouteToWorkspaceParams({
        coach: {
          gender: "man",
          personality: "strict",
          displayName: "Jordan",
          specialization: "workout",
          tagline: "Direct and focused",
        },
      }),
    ).toMatchObject({
      specialization: "workout",
      tab: "chat",
      inputMode: "text",
    });

    expect(mapCoachChatRouteToWorkspaceParams(undefined)).toMatchObject({
      specialization: "workout",
      tab: "chat",
      inputMode: "text",
    });
  });
});
