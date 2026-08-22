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
    ],
  },

  // 開発時は /posts/* をローカル画像サーバーへ転送する。
  // ローカルに画像が無い場合は画像サーバー側でプレースホルダーを返し、
  // 企業プロキシ環境で R2 が不調でもページ全体を確認できるようにする。
  // production は static export のため rewrites キー自体を定義しない。
  ...(process.env.NODE_ENV !== 'production'
    ? {
        async rewrites() {
          const origin = process.env.LOCAL_MEDIA_ORIGIN || 'http://127.0.0.1:3022';
          return [
            {
              source: '/posts/:path*',
              destination: `${origin}/posts/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
