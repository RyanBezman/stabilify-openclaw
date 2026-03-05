import { describe, expect, it, vi } from "vitest";
import { formatLocalDate, formatShortDate, getWeekRange } from "./metrics";

describe("metrics utils", () => {
  it("formats short dates using UTC calendar math", () => {
    const spy = vi.spyOn(Intl, "DateTimeFormat");

    try {
      formatShortDate("2026-02-23");
      expect(spy).toHaveBeenCalledWith(
        "en-US",
        expect.objectContaining({
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("falls back to the raw value for invalid dates", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
  });

  it("computes Monday-start week boundaries for Monday and Sunday dates", () => {
    expect(getWeekRange("2026-02-23")).toEqual({
      weekStart: "2026-02-23",
      weekEnd: "2026-03-01",
    });

    expect(getWeekRange("2026-03-01")).toEqual({
      weekStart: "2026-02-23",
      weekEnd: "2026-03-01",
    });
  });

  it("handles America/Los_Angeles DST transition dates for local date formatting", () => {
    // Spring forward day in Los Angeles (March 8, 2026).
    expect(formatLocalDate(new Date("2026-03-08T09:30:00.000Z"), "America/Los_Angeles")).toBe("2026-03-08");
    expect(formatLocalDate(new Date("2026-03-08T10:30:00.000Z"), "America/Los_Angeles")).toBe("2026-03-08");

    // Fall back day in Los Angeles (November 1, 2026).
    expect(formatLocalDate(new Date("2026-11-01T08:30:00.000Z"), "America/Los_Angeles")).toBe("2026-11-01");
    expect(formatLocalDate(new Date("2026-11-01T09:30:00.000Z"), "America/Los_Angeles")).toBe("2026-11-01");
  });

  it("keeps week-range math stable for DST Sundays using local-date output", () => {
    const springForwardSunday = formatLocalDate(
      new Date("2026-03-08T10:30:00.000Z"),
      "America/Los_Angeles"
    );
    const fallBackSunday = formatLocalDate(
      new Date("2026-11-01T09:30:00.000Z"),
      "America/Los_Angeles"
    );

    expect(getWeekRange(springForwardSunday)).toEqual({
      weekStart: "2026-03-02",
      weekEnd: "2026-03-08",
    });
    expect(getWeekRange(fallBackSunday)).toEqual({
      weekStart: "2026-10-26",
      weekEnd: "2026-11-01",
    });
  });
});
