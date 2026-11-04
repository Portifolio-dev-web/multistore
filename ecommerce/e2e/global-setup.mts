import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, TEST_DATABASE_URL } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dbPackageDir = path.join(repoRoot, "packages", "db");
const prismaBin = path.join(repoRoot, "node_modules", "prisma", "build", "index.js");
const tsxBin = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

export default function globalSetup() {
  console.log("[e2e] recriando o schema de teste (migrations + seed)...");

  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
  };

  // --skip-seed: o seed roda abaixo via caminho direto do tsx, sem depender do PATH do shell.
  execFileSync(
    process.execPath,
    [prismaBin, "migrate", "reset", "--force", "--skip-seed", "--skip-generate"],
    { cwd: dbPackageDir, stdio: "inherit", env },
  );

  execFileSync(process.execPath, [tsxBin, "prisma/seed.ts"], { cwd: dbPackageDir, stdio: "inherit", env });

  // Propaga para os workers de teste, que importam `@repo/db` diretamente (webhook.spec.ts).
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}
