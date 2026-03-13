import { describe, expect, it } from "vitest";
import {
  buildPostAudienceOptions,
  getPostAudienceStatusLabel,
  inferPostVisibilityFromAudienceHint,
  normalizePostAudienceAccountVisibility,
  resolveDefaultPostVisibility,
  sanitizeRequestedPostVisibility,
} from "./postVisibility";

describe("postVisibility", () => {
  it("resolves public accounts to public account visibility", () => {
    expect(normalizePostAudienceAccountVisibility("public")).toBe("public");
    expect(normalizePostAudienceAccountVisibility("followers")).toBe("public");
    expect(normalizePostAudienceAccountVisibility("private")).toBe("private");
    expect(normalizePostAudienceAccountVisibility(null)).toBe("private");
  });

  it("resolves default post visibility from stored preference", () => {
    expect(
      resolveDefaultPostVisibility({
        accountVisibility: "public",
        postShareVisibility: "followers",
      }),
    ).toBe("followers");
    expect(
      resolveDefaultPostVisibility({
        accountVisibility: "private",
        postShareVisibility: "private",
      }),
    ).toBe("private");
  });

  it("falls back to sensible defaults when no post visibility is stored", () => {
    expect(
      resolveDefaultPostVisibility({
        accountVisibility: "public",
        postShareVisibility: null,
      }),
    ).toBe("followers");
    expect(
      resolveDefaultPostVisibility({
        accountVisibility: "private",
        postShareVisibility: null,
      }),
    ).toBe("private");
  });

  it("sanitizes public visibility for non-public accounts", () => {
    expect(
      sanitizeRequestedPostVisibility({
        accountVisibility: "private",
        requestedVisibility: "public",
      }),
    ).toBe("followers");
    expect(
      sanitizeRequestedPostVisibility({
        accountVisibility: "public",
        requestedVisibility: "public",
      }),
    ).toBe("public");
  });

  it("builds available audience options by account visibility", () => {
    expect(buildPostAudienceOptions("public").map((option) => option.visibility)).toEqual([
      "public",
      "followers",
      "close_friends",
      "private",
    ]);
    expect(buildPostAudienceOptions("private").map((option) => option.visibility)).toEqual([
      "followers",
      "close_friends",
      "private",
    ]);
  });

  it("maps hint text back to a post visibility", () => {
    expect(inferPostVisibilityFromAudienceHint("Everyone can see this")).toBe("public");
    expect(inferPostVisibilityFromAudienceHint("Close friends only")).toBe("close_friends");
    expect(inferPostVisibilityFromAudienceHint("Only you can see this")).toBe("private");
    expect(inferPostVisibilityFromAudienceHint("Default audience: followers.")).toBe(
      "followers",
    );
  });

  it("returns the status label for each visibility", () => {
    expect(getPostAudienceStatusLabel("public")).toBe("Everyone can see this");
    expect(getPostAudienceStatusLabel("followers")).toBe("Followers can see this");
    expect(getPostAudienceStatusLabel("close_friends")).toBe("Close friends only");
    expect(getPostAudienceStatusLabel("private")).toBe("Only you can see this");
  });
});
