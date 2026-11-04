import type { Page } from "@playwright/test";
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from "./env";

export async function loginAsLojista(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(SEED_ADMIN_EMAIL);
  await page.getByTestId("login-password-input").fill(SEED_ADMIN_PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL(/\/$/);
}
