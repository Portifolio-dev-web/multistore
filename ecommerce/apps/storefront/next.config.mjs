import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hostname do storage (RustFS em dev, S3/R2 em produção) pra liberar no next/image.
function storageHostname() {
  try {
    return new URL(process.env.S3_PUBLIC_URL ?? "http://localhost:9000").hostname;
  } catch {
    return "localhost";
  }
}

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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }, // produtos do seed de demonstração
      { protocol: process.env.S3_PUBLIC_URL?.startsWith("https") ? "https" : "http", hostname: storageHostname() },
    ],
  },
};

export default nextConfig;
