/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },

  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/posts/:path*',
        destination: '/api/content/posts/:path*',
      },
    ];
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
