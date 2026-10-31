/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db"],
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverComponentsExternalPackages: ["@prisma/client"] },
};

export default nextConfig;
