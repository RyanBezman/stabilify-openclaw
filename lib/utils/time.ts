export const getLocalTimeZone = () => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || "Local time";
  } catch {
    return "Local time";
  }
};

export const toTimeString = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const toDisplayTime = (time: string | null) => {
  if (!time) return "Select time";
  const [hourString, minuteString] = time.split(":");
  const hours = Number(hourString);
  const minutes = Number(minuteString);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "Select time";
  const period = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalized}:${minuteString} ${period}`;
};

export const timeToDate = (time: string | null) => {
  const now = new Date();
  if (!time) return now;
  const [hourString, minuteString] = time.split(":");
  const hours = Number(hourString);
  const minutes = Number(minuteString);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return now;
  const updated = new Date(now);
  updated.setHours(hours, minutes, 0, 0);
  return updated;
};
