import { describe, expect, it } from "vitest";
import { deriveOwnProfileIdentity } from "./ownProfileIdentity";

describe("deriveOwnProfileIdentity", () => {
  it("uses trimmed profile username for title and label", () => {
    const identity = deriveOwnProfileIdentity(
      {
        profile: {
          displayName: "  Ryan  ",
          username: "@@ryan_fit",
        },
      },
      { email: "ryan@example.com", user_metadata: {} } as never,
    );

    expect(identity).toEqual({
      displayName: "Ryan",
      usernameLabel: "@ryan_fit",
      profileHeaderTitle: "ryan_fit",
    });
  });

  it("falls back to auth user name when profile display name is missing", () => {
    const identity = deriveOwnProfileIdentity(
      { profile: { displayName: " ", username: null } },
      { email: "ryan@example.com", user_metadata: { full_name: "Ryan D" } } as never,
    );

    expect(identity).toEqual({
      displayName: "Ryan D",
      usernameLabel: null,
      profileHeaderTitle: "Ryan D",
    });
  });
});
