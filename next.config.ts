import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // 允许局域网 IP 连接开发模式的 HMR 热更新
  allowedDevOrigins: [
    '192.168.31.160',
    'localhost',
    '127.0.0.1',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  }
};

export default nextConfig;
