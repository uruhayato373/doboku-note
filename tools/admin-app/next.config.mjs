import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// リポジトリルート（tools/admin-app の 2 階層上）。
// Turbopack のワークスペースルートをここに固定することで、
//   - 親（C:\Users\m004195\）の package-lock.json への誤 root 推論を防ぎ、
//   - ルート node_modules（next/react）をルート境界内に含める。
const repoRoot = path.resolve(__dirname, '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // このアプリはローカル専用ダッシュボード。静的 export はしない（サイト本体だけが export）。
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
