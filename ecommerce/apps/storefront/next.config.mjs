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

// Sem includeSubDomains no HSTS: a vitrine também responde no domínio próprio do lojista.
// CSP só com frame-ancestors (clickjacking); política de scripts exigiria nonce por causa dos pixels.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  transpilePackages: ["@repo/db", "@repo/mail", "@repo/ui"],
  // Raiz do monorepo: necessário pro rastreio de arquivos do output standalone encontrar
  // as dependências hoisted pelo Yarn workspaces (packages/*).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["@prisma/client", "nodemailer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }, // produtos do seed de demonstração
      { protocol: process.env.S3_PUBLIC_URL?.startsWith("https") ? "https" : "http", hostname: storageHostname() },
    ],
  },
};

export default nextConfig;
