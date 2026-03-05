import { describe, expect, it } from "vitest";
import { isNearFeedBottom } from "./pagination";

describe("isNearFeedBottom", () => {
  it("returns true when content offset crosses threshold", () => {
    expect(
      isNearFeedBottom({
        layoutHeight: 640,
        offsetY: 520,
        contentHeight: 1360,
      }),
    ).toBe(true);
  });

  it("returns false when far from threshold", () => {
    expect(
      isNearFeedBottom(
        {
          layoutHeight: 640,
          offsetY: 200,
          contentHeight: 1360,
        },
        180,
      ),
    ).toBe(false);
  });
});
