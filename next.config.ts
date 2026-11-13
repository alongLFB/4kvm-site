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
  },
  async headers() {
    return [
      {
        source: '/api/((?!v1/auth|v1/sync).*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-access-pin, x-requested-with' },
          { key: 'Access-Control-Expose-Headers', value: 'set-auth-token' },
        ],
      },
    ];
  },
};

export default nextConfig;
