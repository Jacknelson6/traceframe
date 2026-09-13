#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ego-browser nodejs -e 'const {runSmoke} = await import("/Users/jack/Documents/Codex/ui-research/test/ego-smoke.mjs"); await runSmoke(taskSpace);'
