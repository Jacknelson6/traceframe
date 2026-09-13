import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, validateJob } from '../capture-policy.mjs';
const origin = 'https://example.test';
test('normalizes relative URLs, retains hash routes and removes ordinary anchors', () => {
  assert.equal(normalizeUrl('/docs#heading', origin, origin), `${origin}/docs`);
  assert.equal(normalizeUrl('/#/dashboard', origin, origin), `${origin}/#/dashboard`);
  assert.equal(normalizeUrl('/docs?q=one', origin, origin), `${origin}/docs?q=one`);
});
test('rejects foreign origins, embedded credentials, non-web protocols and downloads', () => {
  for (const value of ['https://other.test/', 'https://example.test.evil.test/', 'https://name:secret@example.test/', 'javascript:alert(1)', 'file:///etc/passwd', '/file.pdf', '/archive.ZIP']) {
    assert.equal(normalizeUrl(value, origin, origin), null, value);
  }
});
test('rejects unsafe paths and query actions without rejecting ordinary nouns', () => {
  for (const value of ['/logout', '/users/delete/1', '/?action=approve', '/checkout', '/sign-out']) assert.equal(normalizeUrl(value, origin, origin), null, value);
  assert.equal(normalizeUrl('/payments-guide', origin, origin), `${origin}/payments-guide`);
});
test('rejects unsafe encoded and hash-based application routes', () => {
  for (const value of ['/#/logout', '/#/users/delete/1', '/%64elete', '/?action=%61pprove']) assert.equal(normalizeUrl(value, origin, origin), null, value);
});
test('job defaults and boundary values are validated', () => {
  assert.deepEqual(validateJob({url: origin}), {url: `${origin}/`, username: '', password: '', maxPages: 30, maxStates: 8, mobile: false});
  assert.equal(validateJob({url: origin, maxPages: 150, maxStates: 0}).maxStates, 0);
  for (const maxPages of [0, 151, 1.5, 'bad']) assert.throws(() => validateJob({url: origin, maxPages}));
  for (const maxStates of [-1, 21, 1.5, 'bad']) assert.throws(() => validateJob({url: origin, maxStates}));
  assert.throws(() => validateJob({url: 'file:///etc/passwd'}));
  assert.throws(() => validateJob({url: origin, password: 'x'.repeat(4097)}));
  assert.throws(() => validateJob({url: origin, username: 'x'.repeat(513)}));
});
