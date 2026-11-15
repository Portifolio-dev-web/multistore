import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer", "@aws-sdk/client-s3"],
  experimental: {
    // Upload de imagens via Server Action (limite por arquivo validado na action: 5 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
