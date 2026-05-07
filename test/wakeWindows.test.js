import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWakeWindowMinutes, getWakeWindow } from '../server/wakeWindows.js';

test('gets a wake window by age in weeks', () => {
  assert.equal(getWakeWindow(13).label, '3–4 months');
});

test('uses midpoint wake window', () => {
  const result = calculateWakeWindowMinutes(13);
  assert.equal(result.minutes, 105);
});

test('short nap reduces wake window', () => {
  const result = calculateWakeWindowMinutes(13, 30);
  assert.equal(result.minutes, 89);
  assert.ok(result.adjustmentLabel.includes('Short nap'));
});
