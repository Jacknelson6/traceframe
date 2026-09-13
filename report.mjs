const line = text => String(text ?? '').replace(/[\r\n]/g, ' ').replace(/[\\`*_[\]<>]/g, '\\$&');
export function markdownReport(report) {
  const rows = ['# UI Research', '', `Status: ${line(report.status)}`, `Started: ${line(report.startedAt)}`, '', report.coverage || '', ''];
  if (report.error) rows.push(`Capture issue: ${line(report.error)}`, '');
  for (const page of report.pages) {
    rows.push(`## ${line(page.title || 'Uncaptured page')}`, '', line(page.url), '');
    for (const state of page.states) {
      rows.push(`### ${line(state.label)}`, '', `Screenshot: ${line(state.screenshot || 'Unavailable')}`, '');
      if (!state.animations.length) rows.push('No browser animation evidence was recorded for this state.', '');
      for (const animation of state.animations) {
        rows.push(`- ${line(animation.name)} on ${line(animation.target)} (${line(animation.type)})`,
          `  Duration: ${line(animation.timing.duration)} ms; delay: ${line(animation.timing.delay)} ms; easing: ${line(animation.timing.easing)}; iterations: ${line(animation.timing.iterations)}.`,
          '', '```json', JSON.stringify(animation.keyframes, null, 2), '```', '');
      }
    }
    for (const error of page.errors) rows.push(`Capture issue: ${line(error)}`, '');
  }
  if (report.remainingUrls?.length) rows.push('## Discovered URLs not captured', '', ...report.remainingUrls.map(url => `- ${line(url)}`), '');
  return rows.join('\n');
}
