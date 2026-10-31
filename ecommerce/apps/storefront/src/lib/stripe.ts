import Stripe from "stripe";

let client: Stripe | null = null;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

/** Inicialização preguiçosa: o build não precisa das chaves */
export function getStripe(): Stripe {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), { typescript: true, appInfo: { name: "vitrine-commerce" } });
  return client;
}
