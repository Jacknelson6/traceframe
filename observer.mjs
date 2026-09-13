// Runs in the inspected page. Collects browser animation evidence without page text or form values.
export function installObserver() {
  if (window.__uiResearch) return;
  const records = new Map();
  const describe = (element) => {
    if (!(element instanceof Element)) return 'unknown';
    return element.tagName.toLowerCase() + (element.id ? '#' + element.id.slice(0, 100) : '') +
      [...element.classList].slice(0, 3).map(name => '.' + name.slice(0, 60)).join('');
  };
  const collect = () => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect;
      if (!effect?.getTiming) continue;
      const timing = effect.getTiming();
      if (!Number.isFinite(timing.iterations)) timing.iterations = 'infinite';
      const keyframes = effect.getKeyframes().map(frame => Object.fromEntries(
        Object.entries(frame).filter(([key]) => !/url|image|content/i.test(key))
      ));
      const item = {
        target: describe(effect.target), name: animation.animationName ?? animation.transitionProperty ?? 'Web Animation',
        type: animation.constructor.name, timing, keyframes,
      };
      const key = JSON.stringify(item);
      if (records.size < 500) records.set(key, item);
    }
  };
  let stopAt = Date.now() + 20000;
  function tick() { collect(); if (Date.now() < stopAt) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  window.__uiResearch = {
    read() { collect(); return [...records.values()]; },
    reset() { records.clear(); stopAt = Date.now() + 20000; requestAnimationFrame(tick); },
  };
}

export function inspectPage() {
  const visible = element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  };
  const actions = [...document.querySelectorAll('[role="tab"],button[aria-expanded],summary')]
    .filter(visible)
    .filter(el => !el.closest('form') && !el.disabled)
    .filter(el => !/delete|remove|send|buy|pay|invite|save|submit|publish|approve|sign.?out|log.?out|unsubscribe|checkout/i.test([
      el.textContent, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('href'),
    ].filter(Boolean).join(' ')))
    .slice(0, 40)
    .map((el, index) => {
      el.setAttribute('data-ui-research-action', String(index));
      return { selector: `[data-ui-research-action="${index}"]`, label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 100) };
    });
  return {
    title: document.title,
    links: [...document.querySelectorAll('a[href]')].map(a => a.href),
    actions,
    loginPresent: [...document.querySelectorAll('input[type="password"]')].some(visible),
    animations: window.__uiResearch?.read() ?? [],
  };
}
