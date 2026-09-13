import test from 'node:test';
import assert from 'node:assert/strict';
import { markdownReport } from '../report.mjs';

test('research report preserves motion evidence and incomplete coverage', () => {
  const report = markdownReport({ status: 'partial', startedAt: '2026-09-13', coverage: 'Observed states only.', remainingUrls: ['https://example.com/next'], pages: [{ title: 'Account', url: 'https://example.com/account', errors: ['One state unavailable.'], states: [{ label: 'Open details', screenshot: 'capture-0001.png', animations: [{ name: 'fade', target: 'section.details', type: 'CSSAnimation', timing: { duration: 250, delay: 0, easing: 'ease-out', iterations: 1 }, keyframes: [{ opacity: 0 }, { opacity: 1 }] }] }] }] });
  assert.match(report, /Duration: 250 ms/);
  assert.match(report, /"opacity": 1/);
  assert.match(report, /Discovered URLs not captured/);
  assert.match(report, /One state unavailable/);
});
