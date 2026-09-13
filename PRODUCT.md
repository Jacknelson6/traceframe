# Traceframe

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
A standalone local Node.js app with plain HTML/CSS/JavaScript and Ego Lite for browser execution. No hosted deployment or Vercel deployment.

## Users
Jack and designers researching authenticated web interfaces.

## Product Purpose
Accept a URL and optional login credentials, discover reachable pages, capture screenshots, and document observed animations.

## Capabilities and Constraints
Capture same-origin pages and selected UI interactions with page and time limits. Pause for manual login completion. Keep credentials out of saved output. Report incomplete coverage explicitly. Exhaustive capture of arbitrary applications cannot be guaranteed.

## Operating Context
A private local tool on Jack's Mac. Results are local files for research and reuse.

## Product Identity
Traceframe is the product name. The GitHub repository is currently `Jacknelson6/webapp-map`; clone commands retain that repository name.

## Delivery
Maintain the standalone app in its private GitHub repository. Run captures locally through Ego Lite, with conservative interactions and explicit coverage limits.
