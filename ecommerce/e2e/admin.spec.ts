import { expect, test } from "@playwright/test";
import { ADMIN_URL, STORE_SLUG, STOREFRONT_URL } from "./env";
import { loginAsLojista } from "./helpers";

test.use({ baseURL: ADMIN_URL });

test.describe("admin", () => {
  test("login, cria produto e confere que aparece na vitrine", async ({ page }) => {
    await loginAsLojista(page);

    const productName = `Produto E2E ${Date.now()}`;
    await page.goto("/products/new");
    await page.getByTestId("product-name-input").fill(productName);
    await page.getByTestId("product-price-input").fill("99,90");
    await page.getByTestId("product-stock-input").fill("5");
    await page.getByTestId("product-submit-button").click();

    await page.waitForURL(/\/products$/);
    await expect(page.getByTestId("products-table")).toContainText(productName);

    const storefront = await page.context().browser()!.newPage();
    await storefront.goto(`${STOREFRONT_URL}/${STORE_SLUG}/busca?q=${encodeURIComponent(productName)}`);
    await expect(storefront.getByTestId("products-grid")).toContainText(productName);
    await storefront.close();
  });

  test("muda a cor da loja e confere refletido na vitrine", async ({ page }) => {
    await loginAsLojista(page);

    const newColor = "#ff2d55";
    await page.goto("/settings");
    await page.getByTestId("settings-primaryColor-input").fill(newColor);
    await page.getByTestId("settings-submit-button").click();
    await expect(page.getByTestId("form-success")).toBeVisible();

    const storefront = await page.context().browser()!.newPage();
    await storefront.goto(`${STOREFRONT_URL}/${STORE_SLUG}`);
    await expect(storefront.locator('[style*="--brand"]').first()).toHaveAttribute(
      "style",
      new RegExp(newColor, "i"),
    );
    await storefront.close();
  });
});
