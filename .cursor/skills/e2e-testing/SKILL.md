---
name: e2e-testing
description: Run E2E tests, update visual regression snapshots, and verify features with Playwright. Use when the user wants to run tests, update screenshots, fix failing tests, add new E2E tests, or verify changes after modifying features. CRITICAL - visual regression snapshots must always be generated in Docker.
---

# E2E Testing with Playwright

This skill guides running E2E tests and updating visual regression snapshots for the portfolio. All visual regression tests **must run in Docker** to ensure consistent screenshots across environments.

## Critical Rule

**NEVER run `--update-snapshots` outside Docker.** Screenshots generated locally will differ from CI due to font rendering, anti-aliasing, and platform differences. Always use the Docker commands.

## Quick Reference

| Task                           | Command                                         |
| ------------------------------ | ----------------------------------------------- |
| Run all tests (local)          | `npm run test:e2e`                              |
| Run tests in Docker            | `npm run test:e2e:docker`                       |
| Update snapshots (Docker only) | `npm run test:e2e:docker:update`                |
| Run specific browser           | `npm run test:e2e:docker -- --project=chromium` |
| Run specific test              | `npm run test:e2e:docker -- -g "test name"`     |
| Open test UI                   | `npm run test:e2e:ui`                           |

## Workflow: After Modifying a Feature

When changes affect the UI, follow this workflow:

### Step 1: Run Tests to See Failures

```bash
fnm use && npm run test:e2e:docker
```

Review which visual regression tests fail. The test output shows pixel differences.

### Step 2: Update Snapshots in Docker

```bash
fnm use && npm run test:e2e:docker:update
```

This regenerates all snapshots using the Docker container, ensuring consistency with CI.

### Step 3: Verify Tests Pass

```bash
fnm use && npm run test:e2e:docker
```

All tests should now pass.

### Step 4: Review Changes

```bash
git diff test/e2e.test.ts-snapshots/
```

Visually inspect the updated screenshots to confirm they look correct.

## Workflow: Adding New E2E Tests

### Step 1: Write the Test

Add tests to `test/e2e.test.ts`. Follow existing patterns:

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

### Step 2: Generate Initial Snapshots

```bash
fnm use && npm run test:e2e:docker:update
```

New snapshots are created in `test/e2e.test.ts-snapshots/` with browser-specific suffixes.

### Step 3: Verify and Commit

Review the generated screenshots, then commit both the test and snapshots.

## Test Structure

The test file is organized into two describe blocks:

1. **Portfolio E2E Tests** - Functional tests (page loads, elements visible)
2. **Visual Regression Tests** - Screenshot comparisons

### Browser Coverage

Tests run on three browsers (configured in `playwright.config.ts`):

- Chromium (Chrome)
- Firefox
- WebKit (Safari)

Snapshots are generated per-browser with suffixes like:

- `01-welcome-screen-chromium-darwin.png`
- `01-welcome-screen-firefox-darwin.png`
- `01-welcome-screen-webkit-darwin.png`

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

### Docker Command Fails

Ensure Docker is running:

```bash
docker info
```

### Snapshots Don't Match CI

This happens when snapshots were generated outside Docker. Fix:

```bash
fnm use && npm run test:e2e:docker:update
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
