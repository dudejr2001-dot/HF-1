import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  serverExternalPackages: ['cheerio'],
  allowedDevOrigins: ['*'],
};

export default nextConfig;
