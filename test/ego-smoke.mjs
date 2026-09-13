// Invoke runSmoke(taskSpace) from ego-browser's documented Node runtime.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFixture } from './fixture.mjs';
import { capture } from '../capture.mjs';
export async function runSmoke(taskSpace) {
const fixture = await startFixture();
const directory = await mkdtemp(join(tmpdir(), 'ui-research-smoke-'));
try {
  await capture(async name => {
    const task = await taskSpace(name);
    return {spaceId: task.spaceId, page: label => new Proxy(task.page(label), {get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return async (...args) => {try {return await value.apply(target, args);} catch (error) {console.error('Fixture method failed:', property, error.message); throw error;}};
    }}), finish: () => task.finish({keep: []})};
  }, {id: 'fixture-smoke', directory, url: fixture.url, username: '', password: '', maxPages: 5, maxStates: 2, mobile: false});
  const report = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8'));
  assert.equal(report.status, 'complete', JSON.stringify(report));
  assert.equal(report.pages.length, 2);
  assert.ok(report.pages.every(page => page.states.some(state => state.label === 'Show details')));
  assert.ok(report.pages.some(page => page.states.some(state => state.animations.some(animation => animation.name === 'pulse'))));
  assert.ok(!fixture.requests.some(url => /logout|delete|archive/.test(url)));
  const screenshots = (await readdir(directory)).filter(file => file.endsWith('.png'));
  assert.ok(screenshots.length >= 6);
  for (const file of screenshots) assert.ok((await stat(join(directory, file))).size > 1000);
  console.log(JSON.stringify({passed: true, pages: report.pages.length, screenshots: screenshots.length, directory, requests: fixture.requests}));
} finally { await fixture.close(); }

}
