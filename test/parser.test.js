import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { parseIncomingCommand, parseTimeInZone } from '../server/parser.js';

test('parses age in weeks', () => {
  const result = parseIncomingCommand('AGE 13 WEEKS');
  assert.equal(result.type, 'age');
  assert.equal(result.weeks, 13);
});

test('parses age in months to weeks', () => {
  const result = parseIncomingCommand('age 4 months');
  assert.equal(result.type, 'age');
  assert.equal(result.weeks, 17);
});

test('parses UP command', () => {
  const result = parseIncomingCommand('UP 7:15');
  assert.equal(result.type, 'up');
  assert.equal(result.timeText, '7:15');
});

test('treats bare time as UP', () => {
  const result = parseIncomingCommand('715');
  assert.equal(result.type, 'up');
  assert.equal(result.timeText, '715');
});

test('parses compact time', () => {
  const now = DateTime.fromISO('2026-05-07T08:00:00', { zone: 'America/New_York' });
  const parsed = parseTimeInZone('715', 'America/New_York', now);
  assert.equal(parsed.hour, 7);
  assert.equal(parsed.minute, 15);
});
