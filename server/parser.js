import { DateTime } from 'luxon';

const NUMBER_WORD_RE = /\b(\d{1,3})\b/;

export function normalizeBody(body = '') {
  return String(body || '').trim().replace(/\s+/g, ' ');
}

export function parseIncomingCommand(body = '') {
  const text = normalizeBody(body);
  const lower = text.toLowerCase();

  if (!text) return { type: 'help' };

  if (/^(help|h|\?)$/.test(lower)) return { type: 'help' };
  if (/^(status|profile)$/.test(lower)) return { type: 'status' };
  if (/^(reset|delete|start over)$/.test(lower)) return { type: 'reset' };

  if (lower.startsWith('tz ') || lower.startsWith('timezone ')) {
    const timezone = text.replace(/^(tz|timezone)\s+/i, '').trim();
    return { type: 'timezone', timezone };
  }

  const ageMatch = lower.match(/^age\s+(\d{1,2})\s*(w|wk|wks|week|weeks|m|mo|mos|month|months)?$/i);
  if (ageMatch) {
    const value = Number(ageMatch[1]);
    const unit = ageMatch[2] || 'weeks';
    const weeks = unit.startsWith('m') ? Math.round(value * 4.345) : value;
    return { type: 'age', weeks, originalValue: value, unit };
  }

  if (/^(down|sleep|asleep|nap)(\b|\s)/i.test(lower)) {
    return { type: 'down', timeText: text.replace(/^(down|sleep|asleep|nap)\s*/i, '').trim() };
  }

  if (/^(up|awake|wake|woke up|woke)(\b|\s)/i.test(lower)) {
    return { type: 'up', timeText: text.replace(/^(up|awake|wake|woke up|woke)\s*/i, '').trim() };
  }

  // Forgiving mode: if they only text a time like "7:15" or "715", treat it as UP.
  if (looksLikeOnlyTime(text)) {
    return { type: 'up', timeText: text };
  }

  return { type: 'unknown', raw: text };
}

export function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function looksLikeOnlyTime(text) {
  const trimmed = normalizeBody(text).toLowerCase();
  return /^(\d{1,2})(:?\d{2})?\s*(am|pm)?$/.test(trimmed);
}

export function parseTimeInZone(timeText, timezone, now = DateTime.now().setZone(timezone)) {
  const tz = isValidTimezone(timezone) ? timezone : 'America/New_York';
  const zonedNow = now.setZone(tz);
  const clean = normalizeBody(timeText);

  if (!clean) return zonedNow;

  const token = extractTimeToken(clean);
  if (!token) return null;

  const { hour, minute, meridiem } = token;

  if (meridiem) {
    const hour24 = to24Hour(hour, meridiem);
    return zonedNow.set({ hour: hour24, minute, second: 0, millisecond: 0 });
  }

  const candidates = buildAmbiguousTimeCandidates(zonedNow, hour, minute);
  const validCandidates = candidates
    .filter((candidate) => candidate <= zonedNow.plus({ minutes: 20 }))
    .sort((a, b) => Math.abs(zonedNow.diff(a).as('minutes')) - Math.abs(zonedNow.diff(b).as('minutes')));

  return validCandidates[0] || zonedNow.set({ hour, minute, second: 0, millisecond: 0 });
}

export function extractTimeToken(text) {
  const lower = normalizeBody(text).toLowerCase();
  const match = lower.match(/\b(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] || null;

  // Interpret 715 as 7:15, 1230 as 12:30.
  const compact = match[0].replace(/\s*(am|pm)\s*$/i, '');
  if (!match[2] && /^\d{3,4}$/.test(compact)) {
    const digits = compact;
    hour = Number(digits.slice(0, -2));
    return safeTime({ hour, minute: Number(digits.slice(-2)), meridiem });
  }

  return safeTime({ hour, minute, meridiem });
}

function safeTime({ hour, minute, meridiem }) {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return { hour, minute, meridiem };
}

function to24Hour(hour, meridiem) {
  if (meridiem === 'am') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function buildAmbiguousTimeCandidates(now, hour, minute) {
  const hours = new Set([hour]);
  if (hour >= 1 && hour <= 11) hours.add(hour + 12);
  if (hour === 12) hours.add(0);

  const candidates = [];
  for (const h of hours) {
    const today = now.set({ hour: h, minute, second: 0, millisecond: 0 });
    candidates.push(today);
    candidates.push(today.minus({ days: 1 }));
  }

  return candidates;
}

export function parseNumberFromText(text) {
  const match = normalizeBody(text).match(NUMBER_WORD_RE);
  return match ? Number(match[1]) : null;
}
