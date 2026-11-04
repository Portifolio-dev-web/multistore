import { describe, expect, it } from "vitest";
import { calculateApplicationFeeInCents } from "./stripe";

describe("calculateApplicationFeeInCents", () => {
  it("calcula a porcentagem sobre o total", () => {
    expect(calculateApplicationFeeInCents(10000, 5)).toBe(500);
  });

  it("arredonda pro centavo mais próximo", () => {
    expect(calculateApplicationFeeInCents(9990, 7.5)).toBe(749);
  });

  it("retorna 0 quando a taxa é 0", () => {
    expect(calculateApplicationFeeInCents(10000, 0)).toBe(0);
  });

  it("retorna 0 pra taxa negativa", () => {
    expect(calculateApplicationFeeInCents(10000, -5)).toBe(0);
  });

  it("retorna 0 pra taxa inválida (NaN)", () => {
    expect(calculateApplicationFeeInCents(10000, NaN)).toBe(0);
  });
});
