import { z } from "zod";
import { CEP, isValidCpfOrCnpj, onlyDigits, PHONE_BR } from "@repo/db/utils";

// Etapa 1 do checkout próprio: e-mail, nome, telefone, CPF/CNPJ
export const identificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  phone: z
    .string()
    .trim()
    .regex(PHONE_BR, "Telefone inválido (ex.: (11) 91234-5678)")
    .transform(onlyDigits),
  document: z
    .string()
    .trim()
    .refine(isValidCpfOrCnpj, "CPF ou CNPJ inválido")
    .transform(onlyDigits),
});

// Etapa 2 do checkout próprio: CEP (preenchido via ViaCEP) e endereço completo
export const addressSchema = z.object({
  zip: z.string().trim().regex(CEP, "CEP inválido").transform(onlyDigits),
  street: z.string().trim().min(2, "Informe a rua").max(120),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((v) => v || null),
  district: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z
    .string()
    .trim()
    .length(2, "Use a sigla do estado (ex.: SP)")
    .transform((v) => v.toUpperCase()),
});

// Etapa 3 (resumo): não tem campos próprios, só confirma os dados das etapas 1 e 2
export const customerDetailsSchema = identificationSchema.merge(addressSchema);

export type IdentificationInput = z.infer<typeof identificationSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CustomerDetailsInput = z.infer<typeof customerDetailsSchema>;
