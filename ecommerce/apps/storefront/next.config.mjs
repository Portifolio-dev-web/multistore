/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db", "@repo/mail"],
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "nodemailer"] },
};

export default nextConfig;
