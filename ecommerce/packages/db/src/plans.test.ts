import { describe, expect, it } from "vitest";
import { planAllowsCustomDomain, withinProductLimit, withinUserLimit } from "./plans";

describe("limites de plano", () => {
  it("Grátis permite até 19 produtos, bloqueia a partir de 20", () => {
    expect(withinProductLimit("FREE", 19)).toBe(true);
    expect(withinProductLimit("FREE", 20)).toBe(false);
  });

  it("Pro não tem limite prático de produtos", () => {
    expect(withinProductLimit("PRO", 100_000)).toBe(true);
  });

  it("Grátis permite só 1 usuário (o próprio dono)", () => {
    expect(withinUserLimit("FREE", 0)).toBe(true);
    expect(withinUserLimit("FREE", 1)).toBe(false);
  });

  it("só Essencial e Pro permitem domínio próprio", () => {
    expect(planAllowsCustomDomain("FREE")).toBe(false);
    expect(planAllowsCustomDomain("ESSENCIAL")).toBe(true);
    expect(planAllowsCustomDomain("PRO")).toBe(true);
  });
});
