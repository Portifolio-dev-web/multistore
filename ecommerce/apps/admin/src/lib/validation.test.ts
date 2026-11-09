import { describe, expect, it } from "vitest";
import {
  categorySchema,
  fulfillmentSchema,
  loginSchema,
  productSchema,
  registerSchema,
  storeSettingsSchema,
} from "./validation";

describe("loginSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    expect(loginSchema.safeParse({ email: "dona@loja.com", password: "123456" }).success).toBe(true);
  });

  it("recusa e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "não-é-email", password: "123456" }).success).toBe(false);
  });

  it("recusa senha vazia", () => {
    expect(loginSchema.safeParse({ email: "dona@loja.com", password: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Maria Lojista",
    email: "maria@loja.com",
    password: "senha1234",
    storeName: "Loja da Maria",
    storeSlug: "loja-da-maria",
  };

  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("recusa slug com letra maiúscula ou espaço", () => {
    expect(registerSchema.safeParse({ ...base, storeSlug: "Loja Da Maria" }).success).toBe(false);
  });

  it("recusa senha curta", () => {
    expect(registerSchema.safeParse({ ...base, password: "1234567" }).success).toBe(false);
  });
});

describe("productSchema", () => {
  const base = {
    name: "Camiseta",
    description: "",
    priceInCents: "49,90",
    stock: 10,
    images: "",
    active: true,
  };

  it("categoryIds vazio vira lista vazia", () => {
    const result = productSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.categoryIds).toEqual([]);
  });

  it("converte o preço em texto (BRL) para centavos", () => {
    const result = productSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priceInCents).toBe(4990);
  });

  it("recusa preço abaixo de R$ 0,50", () => {
    expect(productSchema.safeParse({ ...base, priceInCents: "0,10" }).success).toBe(false);
  });

  it("recusa estoque negativo", () => {
    expect(productSchema.safeParse({ ...base, stock: -1 }).success).toBe(false);
  });

  it("recusa URL de imagem inválida", () => {
    expect(productSchema.safeParse({ ...base, images: "não-é-url" }).success).toBe(false);
  });

  it("aceita várias imagens separadas por vírgula ou quebra de linha", () => {
    const result = productSchema.safeParse({
      ...base,
      images: "https://cdn.exemplo.com/a.jpg, https://cdn.exemplo.com/b.jpg",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.images).toHaveLength(2);
  });
});

describe("categorySchema", () => {
  const base = { name: "Roupas", description: "", position: "0" };

  it("aceita categoria raiz sem pai", () => {
    const result = categorySchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBeNull();
  });

  it("recusa nome muito curto", () => {
    expect(categorySchema.safeParse({ ...base, name: "A" }).success).toBe(false);
  });

  it("converte posição em texto pra número", () => {
    const result = categorySchema.safeParse({ ...base, position: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.position).toBe(3);
  });
});

describe("storeSettingsSchema", () => {
  const base = {
    name: "Loja da Maria",
    slug: "loja-da-maria",
    description: undefined,
    logoUrl: undefined,
    primaryColor: "#1f2937",
    accentColor: "#f59e0b",
    customDomain: undefined,
  };

  it("aceita configuração sem domínio próprio", () => {
    expect(storeSettingsSchema.safeParse(base).success).toBe(true);
  });

  it("limpa o protocolo e o caminho do domínio próprio", () => {
    const result = storeSettingsSchema.safeParse({ ...base, customDomain: "https://www.minhaloja.com.br/alguma-pagina" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customDomain).toBe("www.minhaloja.com.br");
  });

  it("recusa cor fora do formato hexadecimal", () => {
    expect(storeSettingsSchema.safeParse({ ...base, primaryColor: "azul" }).success).toBe(false);
  });
});

describe("fulfillmentSchema", () => {
  it("exige código de rastreio para marcar como enviado", () => {
    const result = fulfillmentSchema.safeParse({
      fulfillmentStatus: "SHIPPED",
      carrier: undefined,
      trackingCode: undefined,
      trackingUrl: undefined,
      notify: false,
    });
    expect(result.success).toBe(false);
  });

  it("aceita UNFULFILLED sem código de rastreio", () => {
    const result = fulfillmentSchema.safeParse({
      fulfillmentStatus: "UNFULFILLED",
      carrier: undefined,
      trackingCode: undefined,
      trackingUrl: undefined,
      notify: false,
    });
    expect(result.success).toBe(true);
  });

  it("aceita SHIPPED com código de rastreio", () => {
    const result = fulfillmentSchema.safeParse({
      fulfillmentStatus: "SHIPPED",
      carrier: "Correios",
      trackingCode: "BR123456789",
      trackingUrl: undefined,
      notify: true,
    });
    expect(result.success).toBe(true);
  });
});
