#!/bin/sh
set -eu
ego-browser nodejs -e 'const {diagnose} = await import("/Users/jack/Documents/Codex/ui-research/test/ego-diagnostic.mjs"); await diagnose(taskSpace);'
