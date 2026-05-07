export const WAKE_WINDOWS = [
  { minWeeks: 0, maxWeeks: 4, minMinutes: 45, maxMinutes: 60, label: '0–4 weeks' },
  { minWeeks: 5, maxWeeks: 8, minMinutes: 60, maxMinutes: 90, label: '1–2 months' },
  { minWeeks: 9, maxWeeks: 12, minMinutes: 75, maxMinutes: 100, label: '2–3 months' },
  { minWeeks: 13, maxWeeks: 17, minMinutes: 90, maxMinutes: 120, label: '3–4 months' },
  { minWeeks: 18, maxWeeks: 26, minMinutes: 120, maxMinutes: 180, label: '5–6 months' },
  { minWeeks: 27, maxWeeks: 39, minMinutes: 150, maxMinutes: 210, label: '6–9 months' },
  { minWeeks: 40, maxWeeks: 52, minMinutes: 180, maxMinutes: 240, label: '9–12 months' }
];

export function getWakeWindow(ageWeeks) {
  if (!Number.isFinite(ageWeeks) || ageWeeks < 0) return null;
  return WAKE_WINDOWS.find((row) => ageWeeks >= row.minWeeks && ageWeeks <= row.maxWeeks)
    || WAKE_WINDOWS[WAKE_WINDOWS.length - 1];
}

export function calculateWakeWindowMinutes(ageWeeks, lastNapMinutes = null) {
  const window = getWakeWindow(ageWeeks);
  if (!window) return null;

  let midpoint = Math.round((window.minMinutes + window.maxMinutes) / 2);
  let adjustmentLabel = null;

  if (Number.isFinite(lastNapMinutes)) {
    if (lastNapMinutes > 0 && lastNapMinutes < 45) {
      midpoint = Math.round(midpoint * 0.85);
      adjustmentLabel = 'Short nap detected. I shortened the next wake window a bit.';
    } else if (lastNapMinutes >= 90) {
      midpoint = Math.round(midpoint * 1.05);
      adjustmentLabel = 'Long nap detected. I gave the next wake window a little room.';
    }
  }

  return {
    minutes: midpoint,
    minMinutes: window.minMinutes,
    maxMinutes: window.maxMinutes,
    label: window.label,
    adjustmentLabel
  };
}
