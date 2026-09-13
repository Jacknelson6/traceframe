const $ = selector => document.querySelector(selector);
const token = $('meta[name="research-token"]').content;
let selected = null;
let active = null;
const showError = message => { $('#error').textContent = message; $('#error').hidden = !message; };
async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Research-Token': token }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function element(tag, text, className) { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; }
async function refresh() {
  try {
    const result = await api('/api/captures'); active = result.active;
    if (!selected) selected = result.reports[0]?.id;
    $('#start').disabled = !!active;
    $('#history').replaceChildren();
    for (const report of result.reports) {
      const button = element('button', report.pages[0]?.title || 'New capture');
      button.type = 'button'; button.setAttribute('aria-current', String(report.id === selected));
      button.append(element('small', `${new Date(report.startedAt).toLocaleString()} · ${report.status}`));
      button.onclick = () => { selected = report.id; refresh(); }; $('#history').append(button);
    }
    if (!result.reports.length) $('#history').append(element('p', 'Your captures will appear here.', 'muted'));
    render(result.reports.find(report => report.id === selected));
  } catch(error) { showError(error.message); }
}
function render(report) {
  $('#pages').replaceChildren(); $('#empty').hidden = !!report?.pages?.length;
  $('#download').hidden = !report; $('#coverage').hidden = !report;
  $('#document').hidden = !report;
  $('#login-prompt').hidden = report?.status !== 'awaiting-login';
  $('#running').hidden = !report || active !== report.id;
  if (!report) return;
  $('#report-title').textContent = report.pages[0]?.title || 'Capture collection';
  $('#status').textContent = `${report.status.replaceAll('-', ' ')} · ${report.pages.length} pages captured`;
  $('#coverage').textContent = [report.coverage, report.remainingUrls?.length ? `${report.remainingUrls.length} discovered URLs remain uncaptured.` : '', report.error || ''].filter(Boolean).join(' ');
  $('#download').href = `/captures/${report.id}/report.json`;
  $('#document').href = `/captures/${report.id}/report.md`;
  for (const page of report.pages) {
    const section = element('section', '', 'page'); section.append(element('h3', page.title || 'Uncaptured page'));
    const url = element('span', page.url, 'url'); section.append(url);
    const states = element('div', '', 'states');
    for (const state of page.states) {
      const figure = element('figure', '', 'state'); const link = element('a');
      link.href = `/captures/${report.id}/${state.screenshot}`; link.target = '_blank'; link.rel = 'noopener';
      const img = element('img'); img.src = link.href; img.alt = `${page.title}: ${state.label}`; img.loading = 'lazy';
      link.append(img); figure.append(link, element('figcaption', state.label));
      const details = element('details'); details.append(element('summary', `${state.animations.length} observed animations`));
      details.append(element('pre', state.animations.length ? JSON.stringify(state.animations, null, 2) : 'No browser animation evidence recorded in this state.'));
      figure.append(details); states.append(figure);
    }
    section.append(states);
    for (const error of page.errors) section.append(element('p', error, 'page-error'));
    $('#pages').append(section);
  }
}
$('#capture-form').addEventListener('submit', async event => {
  event.preventDefault(); showError(''); $('#start').disabled = true;
  const form = new FormData(event.currentTarget);
  try {
    const result = await api('/api/captures', { ...Object.fromEntries(form), mobile: form.has('mobile') });
    selected = result.id; $('#password').value = ''; $('#username').value = ''; await refresh();
  } catch(error) { showError(error.message); $('#start').disabled = false; }
});
$('#refresh').onclick = refresh;
$('#continue').onclick = async () => { try { await api(`/api/captures/${selected}/continue`, {}); await refresh(); } catch(error) { showError(error.message); } };
$('#stop').onclick = async () => { try { await api(`/api/captures/${selected}/stop`, {}); $('#status').textContent = 'Stopping capture. Refresh shortly to see saved results.'; } catch(error) { showError(error.message); } };
refresh();
