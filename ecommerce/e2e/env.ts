// Constantes compartilhadas entre playwright.config.ts, global-setup.ts e os specs.
// Portas diferentes das de dev (3000/3001) para não conflitar com `yarn dev`.

export const STOREFRONT_PORT = 3100;
export const ADMIN_PORT = 3101;

export const STOREFRONT_URL = `http://localhost:${STOREFRONT_PORT}`;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;

// Schema isolado no mesmo Postgres de dev — recriado do zero antes da suíte (ver global-setup.ts).
export const TEST_DATABASE_URL =
  "postgresql://vitrine:vitrine_dev_password@localhost:5432/vitrine?schema=e2e_test";

export const STORE_SLUG = "loja-demo";
export const SEED_ADMIN_EMAIL = "e2e@teste.com";
export const SEED_ADMIN_PASSWORD = "SenhaE2E123456";

export const STRIPE_WEBHOOK_SECRET = "whsec_e2e_test_secret";
export const AUTH_SECRET = "e2e-auth-secret-com-pelo-menos-32-caracteres-xyz";
