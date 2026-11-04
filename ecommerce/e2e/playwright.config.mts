import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import {
  ADMIN_PORT,
  ADMIN_URL,
  AUTH_SECRET,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  STOREFRONT_PORT,
  STOREFRONT_URL,
  STRIPE_WEBHOOK_SECRET,
  TEST_DATABASE_URL,
} from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");

const sharedEnv = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  STOREFRONT_URL,
  STOREFRONT_INTERNAL_URL: STOREFRONT_URL,
  STOREFRONT_ROOT_DOMAIN: "",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET,
  AUTH_SECRET,
  COOKIE_SECURE: "false",
  ALLOW_REGISTRATION: "true",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  MAIL_FROM: "pedidos@vitrine.local",
};

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: path.join(__dirname, "global-setup.mts"),
  use: {
    baseURL: STOREFRONT_URL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `"${process.execPath}" "${nextBin}" dev -p ${STOREFRONT_PORT}`,
      cwd: path.join(repoRoot, "apps", "storefront"),
      url: STOREFRONT_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: sharedEnv,
    },
    {
      command: `"${process.execPath}" "${nextBin}" dev -p ${ADMIN_PORT}`,
      cwd: path.join(repoRoot, "apps", "admin"),
      url: ADMIN_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...sharedEnv, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD },
    },
  ],
});
