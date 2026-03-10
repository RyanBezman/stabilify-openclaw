import { describe, expect, it } from "vitest";
import { parseMacroSummary, splitTodayIndicator } from "./todayCard";

describe("todayCard helpers", () => {
  it("parses shorthand macro summaries into table rows", () => {
    expect(parseMacroSummary("P160 C220 F65")).toEqual({
      summary: "P160 C220 F65",
      calories: null,
      rows: [
        { key: "protein", label: "Protein", grams: 160 },
        { key: "carbs", label: "Carbs", grams: 220 },
        { key: "fat", label: "Fat", grams: 65 },
      ],
    });
  });

  it("parses labeled macros and calories", () => {
    expect(parseMacroSummary("2050 kcal / Protein 180g / Carbs 240g / Fat 70g")).toEqual({
      summary: "2050 kcal / Protein 180g / Carbs 240g / Fat 70g",
      calories: 2050,
      rows: [
        { key: "protein", label: "Protein", grams: 180 },
        { key: "carbs", label: "Carbs", grams: 240 },
        { key: "fat", label: "Fat", grams: 70 },
      ],
    });
  });

  it("returns null when the summary does not include all macro targets", () => {
    expect(parseMacroSummary("1900 kcal / 140g protein")).toBeNull();
  });

  it("falls back to an update row when the indicator is unlabeled", () => {
    expect(splitTodayIndicator("Keep momentum today")).toEqual({
      label: "Update",
      value: "Keep momentum today",
    });
  });
});
