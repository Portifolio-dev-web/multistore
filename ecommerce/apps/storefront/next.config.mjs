/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db", "@repo/mail"],
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "nodemailer"] },
};

export default nextConfig;
