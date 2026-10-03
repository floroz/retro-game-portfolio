---
name: e2e-testing
description: Run E2E tests, update visual regression snapshots, and verify features with Playwright in Docker. Use when the user wants to run tests, update screenshots, fix failing tests, add new E2E tests, or verify changes after modifying features.
---

# E2E Testing with Playwright

This skill guides running E2E tests and updating visual regression snapshots for the portfolio. All visual regression tests **must run in Docker** to ensure consistent screenshots across environments.

## Critical Rule

**Run E2E tests and snapshot updates in Docker.** Screenshots generated locally will differ from CI due to font rendering, anti-aliasing, and platform differences. Use the Docker commands below.

## Quick Reference

| Task                           | Command                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| Run all tests                  | `npm run test:e2e:docker`                                                   |
| Update snapshots (Docker only) | `npm run test:e2e:docker:update`                                            |
| Run one test file              | `./scripts/playwright-docker.sh test/e2e-mobile.test.ts`                    |
| Update one test file           | `./scripts/playwright-docker.sh test/e2e-mobile.test.ts --update-snapshots` |
| Run specific browser           | `npm run test:e2e:docker -- --project=chromium`                             |
| Run specific test              | `npm run test:e2e:docker -- -g "test name"`                                 |

CI runs `npm run test:e2e` inside the Playwright container; the local Docker wrapper provides the same Linux environment.

## Workflow: After Modifying a Feature

When changes affect the UI, follow this workflow:

### Step 1: Run Tests to See Failures

```bash
npm run test:e2e:docker
```

Review which visual regression tests fail. The test output shows pixel differences.

### Step 2: Update Snapshots in Docker

```bash
npm run test:e2e:docker:update
```

This regenerates all snapshots using the Docker container, ensuring consistency with CI.

### Step 3: Verify Tests Pass

```bash
npm run test:e2e:docker
```

All tests should now pass.

### Step 4: Review Changes

```bash
git status --short test/
```

Visually inspect the updated desktop and mobile screenshots to confirm they look correct.

## Workflow: Adding New E2E Tests

### Step 1: Write the Test

Add desktop tests to `test/e2e.test.ts` or mobile tests to `test/e2e-mobile.test.ts`. Follow existing patterns:

```typescript
test("new feature test", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Navigate to the feature
  // ...

  // For visual regression, use toHaveScreenshot
  await expect(page).toHaveScreenshot("06-new-feature.png", {
    fullPage: true,
  });
});
```

To compare canvas pixels with an image, compare with the art the build ships, not its PNG source. The build encodes painted art as lossy WebP (`scripts/vite/optimize-images.ts`), which moves colours by a few levels. Use the `shippedArt` helper in `test/e2e-airport.test.ts`. The image pipeline is described in `docs/encoded-images.md`.

### Step 2: Generate Initial Snapshots

```bash
npm run test:e2e:docker:update
```

New snapshots are created beside the test file in a `-snapshots/` directory with browser-specific Linux suffixes.

### Step 3: Verify and Commit

Review the generated screenshots, then commit both the test and snapshots.

## Test Structure

The desktop test file is organized into two describe blocks:

1. **Portfolio E2E Tests** - Functional tests (page loads, elements visible)
2. **Visual Regression Tests** - Screenshot comparisons

### Browser Coverage

Only Chromium runs: desktop tests on the `chromium` project and mobile tests on `mobile-chrome`. Snapshots are generated per project with suffixes like:

- `01-welcome-screen-chromium-linux.png`
- `pocket-about-mobile-chrome-linux.png`

Firefox, WebKit, mobile Safari and tablet projects are still defined in `playwright.config.ts` but disabled. To bring one back, add its name to `enabledProjects`, generate its baselines with `npm run test:e2e:docker:update -- --project=<name>`, review them, and commit the new `*-linux.png` files.

## Docker Configuration

The Docker setup in `scripts/playwright-docker.sh`:

```bash
PLAYWRIGHT_VERSION="v1.58.1"
IMAGE="mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble"
```

**Keep this version in sync with:**

- `package.json` → `@playwright/test` version
- `.github/workflows/pr.yml` → container image version

## Troubleshooting

### Tests Fail with Pixel Differences

Small pixel differences (< 1%) may occur due to timing. Solutions:

1. Add `await page.waitForTimeout(300)` before screenshot
2. Use `reducedMotion: "reduce"` (already configured)
3. Ensure animations complete before capturing

### Canvas Pixels Differ From the Source Image by a Few Levels

The test compares against a PNG source, but the build ships lossy WebP. Compare against `shippedArt(path)` instead of reading the PNG with sharp.

### Docker Command Fails

Ensure Docker is running:

```bash
docker info
```

### Snapshots Don't Match CI

This happens when snapshots were generated outside Docker. Fix:

```bash
npm run test:e2e:docker:update
```

### Test Timeout

Increase timeout for slow operations:

```typescript
await expect(element).toBeVisible({ timeout: 15000 });
```

## Checklist

When updating visual regression tests:

- [ ] Ran tests in Docker (`npm run test:e2e:docker`)
- [ ] Updated snapshots in Docker (`npm run test:e2e:docker:update`)
- [ ] Verified all tests pass (`npm run test:e2e:docker`)
- [ ] Reviewed screenshot changes visually
- [ ] Committed both test changes and updated snapshots
