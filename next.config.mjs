/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Standalone output ensures compatibility for Docker and packaging inside Electron/Tauri
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
  }
};

export default nextConfig;
