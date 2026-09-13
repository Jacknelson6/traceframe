import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { capture } from '../capture.mjs';
test('supplied credentials are used for form fill and omitted from persisted reports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ui-research-credentials-'));
  const config = {directory, id: 'unit', url: 'https://fixture.test/', username: 'fixture-user-secret', password: 'fixture-password-secret', maxPages: 1, maxStates: 0};
  const filled = [];
  let finished = false;
  const state = {title: 'Fixture', links: [], actions: [], loginPresent: false, animations: []};
  const page = {
    cdp: async () => {}, goto: async () => {}, url: async () => config.url,
    waitForFunction: async () => {},
    evaluate: async fn => fn.name === 'inspectPage' ? state : fn.name === 'installObserver' ? undefined : {user: true, pass: true, submit: true},
    fill: async (selector, value) => { filled.push(value); },
    click: async () => { await writeFile(join(directory, 'continue'), ''); },
    screenshot: async ({path}) => { await writeFile(path, 'fake screenshot'); },
  };
  try {
    await capture(async () => ({spaceId: 1, page: () => page, finish: async () => {finished = true;}}), config);
    assert.deepEqual(filled, ['fixture-user-secret', 'fixture-password-secret']);
    assert.equal(config.username, '');
    assert.equal(config.password, '');
    assert.equal(finished, true);
    const reportText = await readFile(join(directory, 'report.json'), 'utf8');
    assert.equal(JSON.parse(reportText).status, 'complete');
    assert.doesNotMatch(reportText, /fixture-user-secret|fixture-password-secret/);
    assert.ok(!(await readdir(directory)).includes('continue'));
  } finally { await rm(directory, {recursive: true, force: true}); }
});
