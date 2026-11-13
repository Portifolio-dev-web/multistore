import { expect, test } from "@playwright/test";
import { STORE_SLUG } from "./env";

test.describe("vitrine", () => {
  test("lista, filtra, abre produto, adiciona ao carrinho e altera quantidade", async ({ page }) => {
    await page.goto(`/${STORE_SLUG}/busca`);
    await expect(page.getByTestId("products-grid")).toBeVisible();

    // busca sem resultado
    await page.getByTestId("filter-search-input").fill("zzz-produto-inexistente-zzz");
    await page.getByTestId("filter-apply-button").click();
    await expect(page.getByTestId("products-empty")).toBeVisible();

    // limpa o filtro
    await page.getByTestId("filter-clear-link").click();
    await expect(page.getByTestId("products-grid")).toBeVisible();
    const totalCount = await page.locator('[data-testid^="product-card-"]').count();

    // "somente em estoque" remove ao menos o item com estoque zero da seed
    await page.getByTestId("filter-in-stock-checkbox").check();
    await page.getByTestId("filter-apply-button").click();
    const inStockCount = await page.locator('[data-testid^="product-card-"]').count();
    expect(inStockCount).toBeLessThan(totalCount);
    await page.getByTestId("filter-clear-link").click();

    // abre o primeiro produto
    await page.locator('[data-testid^="product-card-"]').first().click();
    await expect(page.getByTestId("product-name")).toBeVisible();

    // sobe a quantidade para 2 e adiciona ao carrinho
    await page.getByTestId("qty-increase-button").click();
    await expect(page.getByTestId("qty-value")).toHaveText("2");
    await page.getByTestId("add-to-cart-button").click();
    await expect(page.getByTestId("add-to-cart-confirmation")).toBeVisible();

    // confere no carrinho e aumenta a quantidade ali
    await page.getByTestId("header-cart-link").click();
    await expect(page.getByTestId("cart-items")).toBeVisible();
    const qtyCell = page.locator('[data-testid^="cart-item-qty-"]').first();
    await expect(qtyCell).toHaveText("2");
    await page.locator('[data-testid^="cart-item-increase-"]').first().click();
    await expect(qtyCell).toHaveText("3");
  });
});
