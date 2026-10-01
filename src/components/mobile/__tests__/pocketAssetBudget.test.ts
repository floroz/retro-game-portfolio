import { expect, test } from "vitest";
const files = import.meta.glob<number>("../../../assets/mobile/*.{png,webp}", {
  query: "?shipped-size",
  import: "default",
});

test("mobile scene art stays within its download budget", async () => {
  const entries = await Promise.all(
    Object.entries(files).map(
      async ([name, load]) => [name, await load()] as const,
    ),
  );
  for (const [name, bytes] of entries)
    expect(bytes, name).toBeLessThanOrEqual(512 * 1024);
  const welcome = entries.filter(([name]) =>
    /coffee-(likeness|rest)-day/.test(name),
  );
  expect(
    welcome.reduce((sum, [, bytes]) => sum + bytes, 0),
  ).toBeLessThanOrEqual(1024 * 1024);
  expect(
    entries.reduce((sum, [, bytes]) => sum + bytes, 0),
  ).toBeLessThanOrEqual(3 * 1024 * 1024);
}, 120000);
