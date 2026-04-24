import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },

  // Turbopack のワークスペースルートを明示的に固定。
  // 親ディレクトリ（C:\Users\m004195\）に package-lock.json が存在するため
  // Turbopack が誤って親をルートと誤認し、Tailwind の content scanner が
  // ENOENT を返す問題を防ぐ。
  turbopack: {
    root: __dirname,
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
