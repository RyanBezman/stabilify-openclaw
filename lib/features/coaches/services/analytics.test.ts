import { describe, expect, it } from "vitest";
import { computeAdherenceTrendSummary } from "./analytics";

describe("computeAdherenceTrendSummary", () => {
  it("returns no_data when fewer than two scores are present", () => {
    expect(computeAdherenceTrendSummary([])).toEqual({
      direction: "no_data",
      delta: null,
    });
    expect(computeAdherenceTrendSummary([82])).toEqual({
      direction: "no_data",
      delta: null,
    });
  });

  it("returns up when latest score is at least one point higher", () => {
    expect(computeAdherenceTrendSummary([85, 82])).toEqual({
      direction: "up",
      delta: 3,
    });
  });

  it("returns down when latest score is at least one point lower", () => {
    expect(computeAdherenceTrendSummary([68, 73])).toEqual({
      direction: "down",
      delta: -5,
    });
  });

  it("returns flat when change is less than one point", () => {
    expect(computeAdherenceTrendSummary([80.4, 80])).toEqual({
      direction: "flat",
      delta: 0.4,
    });
    expect(computeAdherenceTrendSummary([79.3, 80])).toEqual({
      direction: "flat",
      delta: -0.7,
    });
  });
});
