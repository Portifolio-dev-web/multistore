import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/db", "@repo/mail"],
  experimental: {
    // Raiz do monorepo: necessário pro rastreio de arquivos do output standalone encontrar
    // as dependências hoisted pelo Yarn workspaces (packages/*).
    outputFileTracingRoot: path.join(__dirname, "../.."),
    serverComponentsExternalPackages: ["@prisma/client", "nodemailer"],
  },
};

export default nextConfig;
