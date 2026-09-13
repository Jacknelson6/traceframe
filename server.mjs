import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { validateJob } from './capture-policy.mjs';
import { markdownReport } from './report.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'captures');
await mkdir(output, { recursive: true, mode: 0o700 });
const token = randomBytes(24).toString('hex');
let active = null;
const port = Number(process.env.PORT || 4317);
const origin = `http://127.0.0.1:${port}`;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (res, status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const validId = id => /^[a-f0-9-]{36}$/.test(id);
async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 16000) throw new Error('Request is too large.'); }
  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return json(res, 403, { error: 'Invalid host.' });
    const url = new URL(req.url, origin);
    if (req.method === 'POST' && (req.headers['x-research-token'] !== token || ![origin, `http://localhost:${port}`].includes(req.headers.origin))) return json(res, 403, { error: 'Reload this local app and try again.' });
    if (req.method === 'GET' && url.pathname === '/') {
      const html = (await readFile(join(root, 'index.html'), 'utf8')).replace('__TOKEN__', token);
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      return res.end(html);
    }
    if (req.method === 'GET' && ['/app.js', '/style.css'].includes(url.pathname)) {
      res.writeHead(200, { ...headers, 'Content-Type': url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
      return res.end(await readFile(join(root, url.pathname.slice(1))));
    }
    if (req.method === 'GET' && url.pathname === '/api/captures') {
      const reports = [];
      for (const entry of await readdir(output)) {
        if (!validId(entry)) continue;
        try { const report = JSON.parse(await readFile(join(output, entry, 'report.json'), 'utf8')); reports.push(report); } catch { /* An initial report may still be writing. */ }
      }
      return json(res, 200, { active: active?.id ?? null, reports: reports.sort((a, b) => b.startedAt.localeCompare(a.startedAt)) });
    }
    if (req.method === 'POST' && url.pathname === '/api/captures') {
      if (active) return json(res, 409, { error: 'Finish or stop the current capture first.' });
      active = { id: null, child: null };
      try {
      const config = validateJob(await body(req));
      const id = randomUUID();
      const directory = join(output, id);
      await mkdir(directory, { mode: 0o700 });
      await writeFile(join(directory, 'report.json'), JSON.stringify({ id, status: 'starting', startedAt: new Date().toISOString(), pages: [] }), { mode: 0o600 });
      if (process.platform === 'darwin') await new Promise(resolve => {
        const browser = spawn('open', ['-a', 'ego lite'], { stdio: 'ignore' });
        browser.once('exit', resolve); browser.once('error', resolve);
      });
      const child = spawn('ego-browser', ['nodejs'], { cwd: root, stdio: ['pipe', 'ignore', 'ignore'] });
      active = { id, child };
      // Configuration travels through stdin, never shell interpolation, argv, or a credential file.
      child.stdin.on('error', () => {});
      child.stdin.end(`const { capture } = await import(${JSON.stringify(new URL('./capture.mjs', import.meta.url).href)}); await capture(taskSpace, ${JSON.stringify({ ...config, id, directory })});`);
      config.username = ''; config.password = '';
      const timer = setTimeout(() => child.kill('SIGTERM'), 30 * 60 * 1000);
      const settle = async () => {
        clearTimeout(timer);
        if (active?.id === id) active = null;
        try {
          const filename = join(directory, 'report.json');
          const report = JSON.parse(await readFile(filename, 'utf8'));
          if (['starting', 'running', 'awaiting-login'].includes(report.status)) {
            report.status = 'interrupted'; report.error = 'Capture stopped. Saved pages are still available.';
            await writeFile(filename, JSON.stringify(report, null, 2), { mode: 0o600 });
          }
        } catch { /* Keep raw browser diagnostics out of the UI. */ }
      };
      child.once('error', settle); child.once('exit', settle);
      return json(res, 202, { id });
      } catch (error) {
        if (active?.id === null) active = null;
        throw error;
      }
    }
    const action = url.pathname.match(/^\/api\/captures\/([a-f0-9-]{36})\/(continue|stop)$/);
    if (req.method === 'POST' && action) {
      if (active?.id !== action[1]) return json(res, 409, { error: 'This capture is no longer running.' });
      if (action[2] === 'stop') active.child.kill('SIGTERM');
      else await writeFile(join(output, active.id, 'continue'), '', { mode: 0o600 });
      return json(res, 200, { ok: true });
    }
    const asset = url.pathname.match(/^\/captures\/([a-f0-9-]{36})\/(report\.(?:json|md)|capture-\d{4}\.png)$/);
    if (req.method === 'GET' && asset) {
      if (asset[2] === 'report.md') {
        const report = JSON.parse(await readFile(join(output, asset[1], 'report.json'), 'utf8'));
        res.writeHead(200, { ...headers, 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': 'attachment; filename="ui-research.md"' });
        return res.end(markdownReport(report));
      }
      const data = await readFile(join(output, asset[1], asset[2]));
      res.writeHead(200, { ...headers, 'Content-Type': asset[2].endsWith('.png') ? 'image/png' : 'application/json', ...(asset[2] === 'report.json' ? { 'Content-Disposition': 'attachment; filename="ui-research.json"' } : {}) });
      return res.end(data);
    }
    json(res, 404, { error: 'Not found.' });
  } catch (error) {
    const safe = /Enter a valid|limit must|Login values|Request is too/.test(error.message);
    json(res, 400, { error: safe ? error.message : 'Request failed. Check your input and try again.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`UI Research: ${origin}`);
  if (process.argv.includes('--open-app') && process.platform === 'darwin') {
    const browser = spawn('open', ['-a', 'ego lite', origin], { stdio: 'ignore' });
    browser.on('error', () => console.log(`Open ${origin} in Ego Lite.`));
  }
});
function stop() { active?.child?.kill('SIGTERM'); server.close(); }
process.once('SIGTERM', stop); process.once('SIGINT', stop);
