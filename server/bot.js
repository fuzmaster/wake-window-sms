import { DateTime } from 'luxon';
import { calculateWakeWindowMinutes } from './wakeWindows.js';
import { isValidTimezone, parseIncomingCommand, parseTimeInZone } from './parser.js';

const DISCLAIMER = 'Not medical advice. Use your pediatrician for health concerns.';

export async function handleSms({ body, from, store, now = DateTime.now() }) {
  const command = parseIncomingCommand(body);
  const existing = await store.getUser(from);
  const user = existing || await store.upsertUser(from, {});
  const timezone = user.timezone || process.env.DEFAULT_TIMEZONE || 'America/New_York';

  switch (command.type) {
    case 'help':
      return helpMessage(user);

    case 'status':
      return statusMessage(user);

    case 'reset':
      await store.deleteUser(from);
      return 'Reset done. Text AGE 13 WEEKS to start again.';

    case 'timezone':
      return handleTimezone(command, from, store);

    case 'age':
      return handleAge(command, from, store);

    case 'down':
      return handleDown(command, from, store, timezone, now);

    case 'up':
      return handleUp(command, from, store, user, timezone, now);

    default:
      return `I didn't catch that. Try: AGE 13 WEEKS, UP, UP 7:15, DOWN, STATUS, or HELP.`;
  }
}

async function handleTimezone(command, from, store) {
  if (!command.timezone || !isValidTimezone(command.timezone)) {
    return 'Timezone not recognized. Try: TZ America/New_York';
  }
  await store.upsertUser(from, { timezone: command.timezone });
  return `Timezone saved: ${command.timezone}.`;
}

async function handleAge(command, from, store) {
  if (!Number.isFinite(command.weeks) || command.weeks < 0 || command.weeks > 104) {
    return 'Age looks off. Try: AGE 13 WEEKS or AGE 4 MONTHS.';
  }

  await store.upsertUser(from, { babyAgeWeeks: command.weeks });
  return `Saved baby age: ${command.weeks} weeks. Text UP when baby wakes. Example: UP or UP 7:15.`;
}

async function handleDown(command, from, store, timezone, now) {
  const sleepStart = parseTimeInZone(command.timeText, timezone, now.setZone(timezone));
  if (!sleepStart || !sleepStart.isValid) {
    return 'I could not read that sleep time. Try DOWN or DOWN 9:15.';
  }

  await store.upsertUser(from, {
    sleepStartAtIso: sleepStart.toISO(),
    lastNapMinutes: null
  });

  return `Sleep start saved: ${formatTime(sleepStart)}. Text UP when baby wakes.`;
}

async function handleUp(command, from, store, user, timezone, now) {
  if (!Number.isFinite(user.babyAgeWeeks)) {
    return 'First, tell me baby age. Example: AGE 13 WEEKS';
  }

  const wakeAt = parseTimeInZone(command.timeText, timezone, now.setZone(timezone));
  if (!wakeAt || !wakeAt.isValid) {
    return 'I could not read that wake time. Try UP, UP 7:15, or just 715.';
  }

  let napMinutes = null;
  if (user.sleepStartAtIso) {
    const sleepStart = DateTime.fromISO(user.sleepStartAtIso).setZone(timezone);
    const duration = wakeAt.diff(sleepStart, 'minutes').minutes;
    if (duration > 0 && duration < 300) {
      napMinutes = Math.round(duration);
    }
  }

  const wakeWindow = calculateWakeWindowMinutes(user.babyAgeWeeks, napMinutes);
  if (!wakeWindow) {
    return 'Baby age is missing. Text AGE 13 WEEKS first.';
  }

  const napTarget = wakeAt.plus({ minutes: wakeWindow.minutes });
  const windDown = napTarget.minus({ minutes: 15 });

  await store.upsertUser(from, {
    lastWakeAtIso: wakeAt.toISO(),
    sleepStartAtIso: null,
    lastNapMinutes: napMinutes
  });

  const parts = [];
  if (wakeWindow.adjustmentLabel) parts.push(wakeWindow.adjustmentLabel);
  if (Number.isFinite(napMinutes)) parts.push(`Nap logged: ${napMinutes} min.`);
  parts.push(`Next nap target: ${formatTime(napTarget)}.`);
  parts.push(`Start winding down: ${formatTime(windDown)}.`);
  parts.push(`Based on ${wakeWindow.label} wake window (${wakeWindow.minMinutes}-${wakeWindow.maxMinutes} min).`);
  parts.push(DISCLAIMER);

  return parts.join('\n');
}

function helpMessage(user) {
  const ageLine = Number.isFinite(user.babyAgeWeeks)
    ? `Current age: ${user.babyAgeWeeks} weeks.`
    : 'Start with: AGE 13 WEEKS';

  return [
    'Wake Window Bot commands:',
    ageLine,
    'UP = baby woke right now',
    'UP 7:15 = override wake time',
    'DOWN = baby fell asleep now',
    'TZ America/New_York = set timezone',
    'STATUS = show saved info',
    'RESET = delete saved info'
  ].join('\n');
}

function statusMessage(user) {
  const timezone = user.timezone || process.env.DEFAULT_TIMEZONE || 'America/New_York';
  const lines = [
    `Age: ${Number.isFinite(user.babyAgeWeeks) ? `${user.babyAgeWeeks} weeks` : 'not set'}`,
    `Timezone: ${timezone}`,
    `Last wake: ${user.lastWakeAtIso ? formatTime(DateTime.fromISO(user.lastWakeAtIso).setZone(timezone)) : 'not set'}`,
    `Sleep start: ${user.sleepStartAtIso ? formatTime(DateTime.fromISO(user.sleepStartAtIso).setZone(timezone)) : 'not set'}`,
    `Last nap: ${Number.isFinite(user.lastNapMinutes) ? `${user.lastNapMinutes} min` : 'not set'}`
  ];
  return lines.join('\n');
}

function formatTime(dateTime) {
  return dateTime.toFormat('h:mm a');
}
