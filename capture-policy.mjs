export const unsafePath = /(?:^|[\/_?=&.-])(logout|log-out|signout|sign-out|delete|destroy|remove|unsubscribe|purchase|checkout|pay|send|approve|invite)(?:$|[\/_?=&.-])/i;

export function normalizeUrl(input, base, origin) {
  try {
    const url = new URL(input, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (origin && url.origin !== origin) return null;
    let route = url.pathname + url.search + url.hash;
    for (let i = 0; i < 3; i++) {
      try { const decoded = decodeURIComponent(route); if (decoded === route) break; route = decoded; } catch { return null; }
    }
    if (unsafePath.test(route)) return null;
    if (/\.(pdf|zip|mp4|mp3|dmg|exe|csv|xlsx?)(?:$)/i.test(url.pathname)) return null;
    // Hash routes carry meaningful application state. Ordinary anchors do not.
    if (!url.hash.startsWith('#/')) url.hash = '';
    return url.href;
  } catch { return null; }
}

export function validateJob(input) {
  const url = normalizeUrl(input.url);
  if (!url) throw new Error('Enter a valid HTTP or HTTPS page URL.');
  const maxPages = Number(input.maxPages ?? 30);
  const maxStates = Number(input.maxStates ?? 8);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 150) throw new Error('Page limit must be 1 to 150.');
  if (!Number.isInteger(maxStates) || maxStates < 0 || maxStates > 20) throw new Error('State limit must be 0 to 20.');
  const username = String(input.username ?? '');
  const password = String(input.password ?? '');
  if (username.length > 512 || password.length > 4096) throw new Error('Login values are too long.');
  return { url, username, password, maxPages, maxStates, mobile: Boolean(input.mobile) };
}
