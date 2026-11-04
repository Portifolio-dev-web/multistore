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
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer", "@aws-sdk/client-s3"],
    // Upload de imagens via Server Action (limite por arquivo validado na action: 5 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
