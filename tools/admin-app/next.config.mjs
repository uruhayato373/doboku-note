import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// リポジトリルート（tools/admin-app の 2 階層上）。
// Turbopack のワークスペースルートをここに固定することで、
//   - 親（C:\Users\m004195\）の package-lock.json への誤 root 推論を防ぎ、
//   - ルート node_modules（next/react）をルート境界内に含める。
const repoRoot = path.resolve(__dirname, '..', '..'); // root-ok: Next の設定ファイル

/** @type {import('next').NextConfig} */
const nextConfig = {
  // このアプリはローカル専用ダッシュボード。静的 export はしない（サイト本体だけが export）。
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: repoRoot,
  },
  // 別 PC から Tailscale（`tailscale serve`）経由で開くときの <mac>.<tailnet>.ts.net を許可する。
  // 待ち受けは 127.0.0.1 のままなので、届くのは Mac 自身と tailnet 内の端末だけ。
  allowedDevOrigins: ['**.ts.net'],
};

export default nextConfig;
