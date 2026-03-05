export function formatDistance(
  meters: number,
  _preferredUnit: "lb" | "kg",
): string {
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)}mi`;
}
