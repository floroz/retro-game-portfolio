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

### Step 2: Update Snapshots Only for Intended Visual Changes

```bash
npm run test:e2e:docker:update
```

Investigate unexpected failures first. Regenerate a baseline only when the visual change is intended; functional compatibility journeys never need baselines.

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

Add screenshot-free desktop journeys to `test/e2e-gameplay.test.ts` and mobile journeys to `test/e2e-mobile-gameplay.test.ts`. Tag critical compatibility journeys `@smoke`. Keep visual checks in `test/e2e.test.ts` and `test/e2e-mobile.test.ts` so their existing baseline paths stay stable. Follow existing patterns:

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

### Step 2: Verify Functional Journeys or Generate Visual Baselines

For tagged functional journeys, run `npm run test:e2e:docker -- --grep @smoke`. Do not generate screenshot baselines for these tests.

For an intended new visual check, generate its Chromium baseline in Docker:

```bash
npm run test:e2e:docker:update -- --project=chromium --project=mobile-chrome
```

New visual snapshots are created beside the visual test file in a `-snapshots/` directory with Chromium project and Linux suffixes.

### Step 3: Verify and Commit

For functional journeys, verify the assertions and commit the tests without image baselines. For intended visual changes, review the generated Linux screenshots and commit the tests and baselines together.

## Test Structure

The dedicated gameplay specs contain screenshot-free functional checks, with critical journeys tagged `@smoke`. The existing visual specs keep their screenshot comparisons and baseline paths. Longer readability and ambient-animation tours can still combine interaction assertions with visual checks, and remain part of the full Chromium suite.

### Browser Coverage

Chromium runs the complete desktop and mobile suites on the `chromium` and `mobile-chrome` projects. Only these projects use committed visual baselines, with suffixes like:

- `01-welcome-screen-chromium-linux.png`
- `pocket-about-mobile-chrome-linux.png`

Firefox and desktop WebKit select only `test/e2e-gameplay.test.ts` and tests tagged `@smoke` (five each). The `mobile-safari` project selects only `test/e2e-mobile-gameplay.test.ts` and `@smoke` (five). Both file matching and tag filtering belong to each project; do not enable the full visual suite on these engines. Failure screenshots and retry traces are temporary report artifacts and must not be committed as baselines. The tablet project remains disabled.

```bash
# Smoke journeys on all enabled projects
npm run test:e2e:docker -- --grep @smoke

# Only the additional browser engines
npm run test:e2e:docker -- --project=firefox --project=webkit --project=mobile-safari
```

Playwright mobile WebKit emulates an iPhone; it does not replace a real-device Safari check for platform-specific touch, scrolling and audio behavior.

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
