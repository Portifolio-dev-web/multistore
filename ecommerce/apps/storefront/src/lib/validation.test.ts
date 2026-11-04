import { describe, expect, it } from "vitest";
import { addressSchema, customerDetailsSchema, identificationSchema } from "./validation";

describe("identificationSchema", () => {
  const base = {
    email: "cliente@teste.com",
    name: "Cliente Teste",
    phone: "(11) 91234-5678",
    document: "529.982.247-25",
  };

  it("aceita dados válidos e normaliza telefone/documento pra só dígitos", () => {
    const result = identificationSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("11912345678");
      expect(result.data.document).toBe("52998224725");
    }
  });

  it("aceita CNPJ no lugar do CPF", () => {
    expect(identificationSchema.safeParse({ ...base, document: "11.222.333/0001-81" }).success).toBe(true);
  });

  it("recusa e-mail inválido", () => {
    expect(identificationSchema.safeParse({ ...base, email: "não-é-email" }).success).toBe(false);
  });

  it("recusa CPF/CNPJ com dígito verificador errado", () => {
    expect(identificationSchema.safeParse({ ...base, document: "529.982.247-26" }).success).toBe(false);
  });

  it("recusa telefone fora do formato brasileiro", () => {
    expect(identificationSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
  });
});

describe("addressSchema", () => {
  const base = {
    zip: "01311-000",
    street: "Av. Paulista",
    number: "1000",
    complement: "ap. 101",
    district: "Bela Vista",
    city: "São Paulo",
    state: "sp",
  };

  it("aceita endereço completo e normaliza CEP e estado", () => {
    const result = addressSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zip).toBe("01311000");
      expect(result.data.state).toBe("SP");
    }
  });

  it("aceita complemento vazio", () => {
    const result = addressSchema.safeParse({ ...base, complement: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.complement).toBeNull();
  });

  it("recusa CEP fora do formato", () => {
    expect(addressSchema.safeParse({ ...base, zip: "123" }).success).toBe(false);
  });

  it("recusa sigla de estado com mais de 2 letras", () => {
    expect(addressSchema.safeParse({ ...base, state: "São Paulo" }).success).toBe(false);
  });
});

describe("customerDetailsSchema", () => {
  it("combina identificação e endereço num único objeto", () => {
    const result = customerDetailsSchema.safeParse({
      email: "cliente@teste.com",
      name: "Cliente Teste",
      phone: "(11) 91234-5678",
      document: "529.982.247-25",
      zip: "01311-000",
      street: "Av. Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
    expect(result.success).toBe(true);
  });
});
