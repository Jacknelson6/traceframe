# UI Research

A local research app powered by Ego Lite. Supply a website URL and optional login, capture reachable pages and selected interface states, and inspect screenshots with recorded animation timing and keyframes.

## Start

Requires Node.js 22+ and the installed `ego-browser` CLI with Ego Lite running.

Double-click `Launch.command`, or run `npm start` in this directory and open http://127.0.0.1:4317. Stop the server with Control-C in its terminal.

## Capture

1. Enter the URL. For authenticated sites, use the login page and expand the sign-in fields.
2. Choose page/state limits and optionally mobile width, then start.
3. The app fills recognized username/password fields and submits a recognized form. It pauses for you to confirm login in Ego Lite, including MFA, SSO, or unrecognized forms. Credentials are cleared after filling and are not saved to reports. If the page redirects to another origin before filling, finish login manually.
4. Select **I'm signed in, continue**. Refresh the collection to see progress. Stop is available during the run.
5. Open any screenshot at full size, expand observed animations, or download the Markdown report or JSON data. All files live under `captures/<run-id>/`.

## Coverage

The crawler follows same-origin links, retains hash routes, and records initial page, tab, disclosure, and scroll states. It excludes common destructive routes and form controls; custom application controls may still have side effects, so use a test account. It does not submit ordinary application forms.

Motion evidence comes from the browser Web Animations API, including CSS animations and transitions. Each record contains the target, type, name, timing, and keyframes. Screenshots capture states, not videos. Canvas, WebGL, video, cross-origin frames, inaccessible routes, and untriggered animations are not exhaustively covered. A completed crawl means the bounded discovered URL queue was visited, not that every possible application state was found.

Runs stop after a 25-minute engine deadline, with a 30-minute process limit and a five-minute login wait. Reports label incomplete or interrupted runs. Each run uses one Ego task space. Login sessions may remain in Ego Lite; screenshots may contain private application content. Results stay on this Mac and are ignored by Git. The server binds only to loopback and checks request origin and a per-session token for actions.

## Verify

`npm test` runs policy and credential tests. The optional real browser fixture test is documented in `test/ego-smoke.mjs`; it requires Ego Lite and captures only a local test site.

Verified locally: seven unit tests, two fixture pages with six PNG screenshots, finite transition settling, animation timing/keyframes, excluded links, and desktop/mobile layouts. Live third-party login flows remain site-dependent; they were not exercised in this build.
