/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
