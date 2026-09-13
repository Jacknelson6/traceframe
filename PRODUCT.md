# UI Research

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Assumption pending user response: a local Node.js app with plain HTML/CSS/JavaScript and Ego Lite for browser execution. No hosted deployment.

## Users
Jack and designers researching authenticated web interfaces.

## Product Purpose
Accept a URL and optional login credentials, discover reachable pages, capture screenshots, and document observed animations.

## Capabilities and Constraints
Capture same-origin pages and selected UI interactions with page and time limits. Pause for manual login completion. Keep credentials out of saved output. Report incomplete coverage explicitly. Exhaustive capture of arbitrary applications cannot be guaranteed.

## Operating Context
Assumption: a private local tool on Jack's Mac. Results are local files for research and reuse.

## Open Decisions
Standalone versus Cortex integration, hosting, and broader action permissions were asked in chat and remain unconfirmed. Implementation defaults to standalone and conservative interactions.
