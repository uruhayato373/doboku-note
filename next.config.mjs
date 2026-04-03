/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // ローカル開発時: R2 コンテンツを localhost:3021 から配信
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/content/:path*',
          destination: 'http://localhost:3021/content/:path*',
        },
      ];
    }
    return [];
  },

  experimental: {
    optimizePackageImports: [
      '@/components',
      '@/lib',
      'lucide-react',
      'react-icons',
    ],
  },
};

export default nextConfig;
