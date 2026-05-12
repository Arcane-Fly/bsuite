#!/usr/bin/env bash
set -euo pipefail

PATTERN='BEGIN (RSA |EC )?PRIVATE KEY'

if git --no-pager grep -nE "$PATTERN" -- . ':(exclude)docs/**' ':(exclude)**/*.md' >/tmp/github-app-key-check.out; then
  echo "::error::Detected private key material in repository files"
  cat /tmp/github-app-key-check.out
  exit 1
fi

echo "✓ No private key material found in tracked source files"
