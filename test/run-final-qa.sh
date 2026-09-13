#!/bin/sh
set -eu
ego-browser nodejs -e 'const {finalQa} = await import("/Users/jack/Documents/Codex/ui-research/test/ego-final-qa.mjs"); await finalQa(taskSpace);'
