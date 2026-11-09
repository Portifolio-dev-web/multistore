import { describe, expect, it } from "vitest";
import type { ShippingRate } from "@repo/db";
import { getShippingQuotes } from "./index";
import { fixedRateQuotes } from "./fixed";
import { haversineDistanceKm, motoboyPriceInCents } from "./motoboy";
import { pickupQuote } from "./pickup";

describe("pickupQuote", () => {
  it("devolve a opção grátis quando a loja habilita retirada", () => {
    expect(pickupQuote({ pickupEnabled: true })).toEqual([
      { id: "pickup", name: "Retirar na loja", priceInCents: 0, minDays: 0, maxDays: 0 },
    ]);
  });

  it("não devolve nada quando a loja não habilita", () => {
    expect(pickupQuote({ pickupEnabled: false })).toEqual([]);
  });
});

describe("fixedRateQuotes", () => {
  const rates: ShippingRate[] = [
    { id: "r1", storeId: "s1", type: "STATE", label: "SP", state: "SP", zipFrom: null, zipTo: null, priceInCents: 1500, minDays: 2, maxDays: 4, createdAt: new Date() },
    { id: "r2", storeId: "s1", type: "ZIP_RANGE", label: "Região central", state: null, zipFrom: "01000-000", zipTo: "01999-999", priceInCents: 800, minDays: 1, maxDays: 2, createdAt: new Date() },
  ];

  it("casa regra por estado", () => {
    const result = fixedRateQuotes(rates, { zip: "20000-000", state: "SP" });
    expect(result).toEqual([{ id: "r1", name: "SP", priceInCents: 1500, minDays: 2, maxDays: 4 }]);
  });

  it("casa regra por faixa de CEP", () => {
    const result = fixedRateQuotes(rates, { zip: "01311-000", state: "SP" });
    expect(result.map((r) => r.id)).toContain("r2");
  });

  it("CEP fora da faixa não casa a regra de faixa", () => {
    const result = fixedRateQuotes(rates, { zip: "05000-000", state: "SP" });
    expect(result.map((r) => r.id)).not.toContain("r2");
  });

  it("estado sem regra cadastrada não retorna nada", () => {
    expect(fixedRateQuotes(rates, { zip: "90000-000", state: "RS" })).toEqual([]);
  });
});

describe("haversineDistanceKm", () => {
  it("distância zero entre o mesmo ponto", () => {
    expect(haversineDistanceKm({ lat: -23.5, lng: -46.6 }, { lat: -23.5, lng: -46.6 })).toBeCloseTo(0, 5);
  });

  it("calcula a distância aproximada entre dois pontos conhecidos (~8km)", () => {
    // Av. Paulista -> Aeroporto de Congonhas, São Paulo
    const distance = haversineDistanceKm({ lat: -23.5613, lng: -46.6565 }, { lat: -23.6261, lng: -46.6553 });
    expect(distance).toBeGreaterThan(6);
    expect(distance).toBeLessThan(10);
  });
});

describe("motoboyPriceInCents", () => {
  it("multiplica distância pelo preço por km", () => {
    expect(motoboyPriceInCents(5, 200, null)).toBe(1000);
  });

  it("aplica o piso mínimo quando o cálculo fica abaixo dele", () => {
    expect(motoboyPriceInCents(1, 200, 1000)).toBe(1000);
  });

  it("não aplica piso quando o cálculo já é maior", () => {
    expect(motoboyPriceInCents(10, 200, 1000)).toBe(2000);
  });
});

describe("getShippingQuotes", () => {
  const baseStore = {
    originZip: null,
    motoboyEnabled: false,
    motoboyPricePerKmInCents: null,
    motoboyMinPriceInCents: null,
    motoboyMaxDistanceKm: null,
    pickupEnabled: true,
    freeShippingMinInCents: null as number | null,
  };

  it("zera o preço das opções pagas quando o subtotal passa do mínimo de frete grátis", async () => {
    const rates: ShippingRate[] = [
      { id: "r1", storeId: "s1", type: "STATE", label: "SP", state: "SP", zipFrom: null, zipTo: null, priceInCents: 1500, minDays: 2, maxDays: 4, createdAt: new Date() },
    ];
    const quotes = await getShippingQuotes({
      store: { ...baseStore, freeShippingMinInCents: 10000 },
      rates,
      destination: { zip: "20000-000", state: "SP" },
      items: [],
      subtotalInCents: 15000,
    });
    expect(quotes.find((q) => q.id === "r1")?.priceInCents).toBe(0);
  });

  it("mantém o preço normal quando o subtotal não atinge o mínimo", async () => {
    const rates: ShippingRate[] = [
      { id: "r1", storeId: "s1", type: "STATE", label: "SP", state: "SP", zipFrom: null, zipTo: null, priceInCents: 1500, minDays: 2, maxDays: 4, createdAt: new Date() },
    ];
    const quotes = await getShippingQuotes({
      store: { ...baseStore, freeShippingMinInCents: 10000 },
      rates,
      destination: { zip: "20000-000", state: "SP" },
      items: [],
      subtotalInCents: 5000,
    });
    expect(quotes.find((q) => q.id === "r1")?.priceInCents).toBe(1500);
  });
});
