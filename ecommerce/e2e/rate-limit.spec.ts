// Igual ao stock-reservation.spec.ts: precisa de Postgres de verdade, por isso mora no e2e.
import { expect, test } from "@playwright/test";
import { clientIp, prisma, rateLimit } from "@repo/db";

test.describe("rate limit", () => {
  test("bloqueia depois do limite e não afeta outra chave", async () => {
    const key = `teste:${Date.now()}`;
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(false);
    expect(await rateLimit(`${key}:outra`, 2, 60_000)).toBe(true);
  });

  test("tentativa fora da janela não conta", async () => {
    const key = `teste-janela:${Date.now()}`;
    await prisma.rateLimitHit.create({ data: { key, createdAt: new Date(Date.now() - 120_000) } });
    expect(await rateLimit(key, 1, 60_000)).toBe(true); // a de 2 min atrás já saiu da janela de 1 min
    expect(await rateLimit(key, 1, 60_000)).toBe(false);
  });

  test("clientIp prefere o header do proxy da hospedagem", () => {
    expect(clientIp(new Headers({ "fly-client-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
