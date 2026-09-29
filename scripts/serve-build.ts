/**
 * Builds the site into a temporary folder and serves it with Vite's preview
 * server on a free port (`strictPort`, so it never clashes with a dev
 * server), for the scripts that drive the real game in a browser
 * (generate-og-image.ts, check-reachability.ts).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A port nobody is listening on. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

export interface BuiltSite {
  /** Where the site is served, with a trailing slash. */
  url: string;
  /** Stops the server and deletes the build. */
  close: () => Promise<void>;
}

export async function serveBuild(): Promise<BuiltSite> {
  // index.html is generated from profile.ts and not committed.
  if (!existsSync(join(root, "index.html"))) {
    execFileSync("npx", ["tsx", "scripts/generate-html.ts"], {
      cwd: root,
      stdio: "inherit",
    });
  }

  const outDir = mkdtempSync(join(tmpdir(), "rgp-build-"));
  await build({
    root,
    logLevel: "warn",
    build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  });
  const server = await preview({
    root,
    logLevel: "warn",
    build: { outDir },
    preview: { host: "127.0.0.1", port: await freePort(), strictPort: true },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("The preview server has no URL");
  console.log(`Serving the build at ${url}`);

  return {
    url,
    close: async () => {
      await server.close();
      rmSync(outDir, { recursive: true, force: true });
    },
  };
}
