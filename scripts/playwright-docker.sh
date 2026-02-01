#!/bin/bash
# Run Playwright tests inside Docker for consistent screenshots
# This ensures screenshots match between local development and CI

set -e

PLAYWRIGHT_VERSION="v1.58.1"
IMAGE="mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble"

echo "Running Playwright tests in Docker container: $IMAGE"

# Create a named volume for node_modules to avoid overwriting local binaries
VOLUME_NAME="portfolio-v4-playwright-node-modules"

# Set VITE_TYPEWRITER_SPEED=0 to disable typewriter animation during E2E tests
# This eliminates timing issues and race conditions with the typewriter effect
docker run --rm -it \
  -v "$(pwd):/work" \
  -v "${VOLUME_NAME}:/work/node_modules" \
  -w /work \
  --ipc=host \
  -e "VITE_TYPEWRITER_SPEED=0" \
  "$IMAGE" \
  /bin/bash -c "npm ci && npm run test:e2e -- $*"
