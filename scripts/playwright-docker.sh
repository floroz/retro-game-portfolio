#!/bin/bash
# Run Playwright tests inside Docker for consistent screenshots
# This ensures screenshots match between local development and CI

set -e

PLAYWRIGHT_VERSION="v1.58.1"
IMAGE="mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble"

echo "Running Playwright tests in Docker container: $IMAGE"

# Give each run its own dependencies so concurrent worktrees cannot overwrite
# one another during npm ci. Docker removes this anonymous volume on exit.
docker run --rm -it \
  -v "$(pwd):/work" \
  -v /work/node_modules \
  -w /work \
  --ipc=host \
  "$IMAGE" \
  /bin/bash -c 'npm ci && npm run test:e2e -- "$@"' -- "$@"
