import { writeFile, mkdir, access, unlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeUrl } from './capture-policy.mjs';
import { installObserver, inspectPage } from './observer.mjs';

// Invoked inside ego-browser's documented Node runtime, never imports or launches Chrome.
export async function capture(taskSpace, config) {
  const { directory, id } = config;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const report = {
    id, startedAt: new Date().toISOString(), status: 'running', pages: [], skipped: [],
    limits: { maxPages: config.maxPages, maxStates: config.maxStates },
    coverage: 'Reachable same-origin links and observed tab, disclosure, and scroll states. Canvas, video, cross-origin frames, hidden workflows, and untriggered motion are not exhaustively documented.',
  };
  const save = async () => {
    await writeFile(join(directory, 'report.tmp'), JSON.stringify(report, null, 2), { mode: 0o600 });
    await rename(join(directory, 'report.tmp'), join(directory, 'report.json'));
    console.log(JSON.stringify({ event: 'progress', id, status: report.status, pages: report.pages.length }));
  };
  const task = await taskSpace(`UI research ${id}`);
  const page = task.page('p1');
  report.spaceId = task.spaceId;
  await save();
  const deadline = Date.now() + 25 * 60 * 1000;
  const checkDeadline = () => { if (Date.now() > deadline) throw new Error('Capture reached its 25-minute deadline.'); };
  const pauseForLogin = async () => {
    report.status = 'awaiting-login';
    await save();
    // One bounded wait for explicit user continuation; never infer successful MFA.
    const { watch } = await import('node:fs');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { watcher.close(); reject(new Error('Login wait expired after five minutes. Start a new capture to continue.')); }, 5 * 60 * 1000);
      const watcher = watch(directory, async (_event, name) => {
        if (name !== 'continue') return;
        try { await access(join(directory, 'continue')); } catch { return; }
        clearTimeout(timer); watcher.close(); resolve();
      });
      access(join(directory, 'continue')).then(() => { clearTimeout(timer); watcher.close(); resolve(); }).catch(() => {});
    });
    await unlink(join(directory, 'continue')).catch(() => {});
    report.status = 'running';
  };
  try {
    await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${installObserver.toString()})()` });
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: config.mobile ? 390 : 1440, height: config.mobile ? 844 : 1000, deviceScaleFactor: 1, mobile: config.mobile });
    await page.goto(config.url);
    await page.evaluate(installObserver);
    // Observe form structure before using selectors, including multi-step login forms.
    if (config.username || config.password) {
      if (new URL(await page.url()).origin !== new URL(config.url).origin) {
        config.username = ''; config.password = '';
        await pauseForLogin();
      } else {
      const form = await page.evaluate(() => {
        const visible = el => el.getBoundingClientRect().width > 0;
        const user = [...document.querySelectorAll('input[type="email"],input[autocomplete="username"],input[name="username"],input[name="email"]')].find(visible);
        const pass = [...document.querySelectorAll('input[type="password"]')].find(visible);
        user?.setAttribute('data-ui-research-login', 'username');
        pass?.setAttribute('data-ui-research-login', 'password');
        const parent = pass?.form || user?.form;
        const submit = parent?.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
        submit?.setAttribute('data-ui-research-login', 'submit');
        return { user: !!user, pass: !!pass, submit: !!submit };
      });
      if (form.user && config.username) await page.fill('[data-ui-research-login="username"]', config.username);
      if (form.pass && config.password) await page.fill('[data-ui-research-login="password"]', config.password);
      if (form.submit && (form.user || form.pass)) await page.click('[data-ui-research-login="submit"]');
      // The browser remains visible for SSO, multi-step login, CAPTCHA, and MFA.
      config.username = ''; config.password = '';
      await pauseForLogin();
      }
    } else if ((await page.evaluate(inspectPage)).loginPresent) {
      await pauseForLogin();
    }
    if ((await page.evaluate(inspectPage)).loginPresent) throw new Error('A password form is still visible. Complete login before resuming.');
    const start = await page.url();
    const origin = new URL(start).origin;
    const queue = [start];
    const seen = new Set();
    let screenshotNumber = 0;
    const snapshot = async (record, label) => {
      checkDeadline();
      const filename = `capture-${String(++screenshotNumber).padStart(4, '0')}.png`;
      await page.cdp('Page.bringToFront');
      await page.waitForFunction(() => document.getAnimations().every(animation => {
        const end = animation.effect?.getComputedTiming().endTime;
        return !Number.isFinite(end) || end > 3000 || animation.playState !== 'running';
      }), undefined, { timeout: 3500 }).catch(() => {});
      await page.screenshot({ path: join(directory, filename), fullPage: true });
      const state = await page.evaluate(inspectPage);
      record.states.push({ label, screenshot: filename, animations: state.animations });
      return state;
    };
    while (queue.length && report.pages.length < config.maxPages) {
      checkDeadline();
      const target = queue.shift();
      if (seen.has(target)) continue;
      seen.add(target);
      const record = { url: target, title: '', states: [], errors: [] };
      report.pages.push(record);
      try {
        await page.goto(target);
        const finalUrl = await page.url();
        if (new URL(finalUrl).origin !== origin) {
          record.errors.push('Redirected outside capture origin.'); await save(); continue;
        }
        seen.add(normalizeUrl(finalUrl, origin, origin));
        await page.evaluate(installObserver);
        let state = await page.evaluate(inspectPage);
        if (state.loginPresent) { record.errors.push('Login required; page capture skipped.'); await save(); continue; }
        record.title = state.title;
        state = await snapshot(record, 'Page load');
        const addLinks = links => {
          for (const link of links) {
            const candidate = normalizeUrl(link, finalUrl, origin);
            if (candidate && !seen.has(candidate) && !queue.includes(candidate) && queue.length < 1000) queue.push(candidate);
          }
        };
        addLinks(state.links);
        for (const action of state.actions.slice(0, config.maxStates)) {
          try {
            const destination = await page.evaluate(selector => document.querySelector(selector)?.closest('a')?.href ?? null, action.selector);
            if (destination && !normalizeUrl(destination, target, origin)) continue;
            await page.evaluate(() => window.__uiResearch?.reset());
            await page.click(action.selector);
            if (new URL(await page.url()).origin !== origin) throw new Error('Interaction left capture origin.');
            const opened = await snapshot(record, action.label);
            addLinks(opened.links);
            // Restore the known initial state before exploring the next branch.
            await page.goto(target);
            await page.evaluate(installObserver);
            await page.evaluate(inspectPage);
          } catch {
            record.errors.push(`Could not capture interaction: ${action.label}`);
            await page.goto(target);
            await page.evaluate(installObserver);
            await page.evaluate(inspectPage);
          }
        }
        await page.evaluate(() => { window.__uiResearch?.reset(); window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); });
        await snapshot(record, 'Scroll to bottom');
      } catch {
        record.errors.push('Page could not be captured. Check the site in Ego Lite and try a smaller capture.');
      }
      await save();
    }
    report.remainingUrls = queue.filter(url => !seen.has(url));
    report.status = report.remainingUrls.length || report.pages.some(p => p.errors.length) ? 'partial' : 'complete';
    report.finishedAt = new Date().toISOString();
    await save();
  } catch (error) {
    report.status = 'failed';
    // Only our known errors are exposed. Browser errors can contain sensitive page values.
    report.error = /deadline|wait expired|password form/.test(error.message) ? error.message : 'Capture interrupted. Check Ego Lite and retry.';
    await save();
  } finally {
    config.username = ''; config.password = '';
    await task.finish({ keep: 'all' }).catch(() => {});
  }
}
