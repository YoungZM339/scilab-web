import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";

const e2eRoot = path.join(
  os.tmpdir(),
  `scilab-web-e2e-${process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? "local"}`,
);
const e2eBaseUrl = "http://127.0.0.1:3101";
const e2eEnv = {
  DATABASE_PATH: path.join(e2eRoot, "scilab.db"),
  UPLOAD_DIR: path.join(e2eRoot, "uploads"),
  BETTER_AUTH_SECRET: "e2e-only-secret-12345678901234567890",
  BETTER_AUTH_URL: e2eBaseUrl,
  SITE_URL: e2eBaseUrl,
  AUTH_TRUSTED_ORIGINS: e2eBaseUrl,
  E2E_ADMIN_EMAIL: "e2e-admin@example.com",
  E2E_ADMIN_NAME: "E2E 管理员",
  E2E_ADMIN_PASSWORD:
    process.env.E2E_ADMIN_PASSWORD ??
    `E2E-${randomBytes(24).toString("base64url")}!`,
};

Object.assign(process.env, e2eEnv);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // All E2E projects intentionally share one isolated SQLite database.
  // A single worker prevents cross-file write races and cache-order flakiness.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "pnpm exec tsx scripts/e2e-setup.ts && pnpm exec next dev --hostname 127.0.0.1 --port 3101",
    url: `${e2eBaseUrl}/api/health`,
    env: e2eEnv,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
