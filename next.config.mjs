/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  async rewrites() {
    // next dev 時のみ有効。ビルド後の静的出力には含まれない。
    // /content/* へのリクエストをローカルR2サーバーにプロキシ
    return [
      {
        source: '/content/:path*',
        destination: `http://localhost:${process.env.LOCAL_R2_PORT || 3021}/content/:path*`,
      },
    ];
  },
};

export default nextConfig;
