#!/bin/bash
# Run Playwright tests inside Docker for consistent screenshots
# This ensures screenshots match between local development and CI

set -e

PLAYWRIGHT_VERSION="v1.58.1"
IMAGE="mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble"

echo "Running Playwright tests in Docker container: $IMAGE"

# Create a named volume for node_modules to avoid overwriting local binaries
VOLUME_NAME="portfolio-v4-playwright-node-modules"

docker run --rm -it \
  -v "$(pwd):/work" \
  -v "${VOLUME_NAME}:/work/node_modules" \
  -w /work \
  --ipc=host \
  "$IMAGE" \
  /bin/bash -c "npm ci && npm run test:e2e -- $*"
