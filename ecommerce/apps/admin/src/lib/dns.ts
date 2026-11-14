import { resolveTxt } from "node:dns/promises";

/** F6.5: domínio comprova posse criando um TXT em _multistore.<domínio> com o token que geramos */
export async function verifyDomainTxt(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`_multistore.${domain}`);
    return records.some((chunks) => chunks.join("").trim() === expectedToken);
  } catch {
    return false;
  }
}
