#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node --test test/*.test.mjs
