/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db", "@repo/mail"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer", "@aws-sdk/client-s3"],
    // Upload de imagens via Server Action (limite por arquivo validado na action: 5 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
