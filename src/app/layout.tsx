import type { Metadata } from 'next';
import Script from 'next/script';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'doboku-note',
    template: '%s | doboku-note',
  },
  description:
    '土木技術に関する仕事に携わる中で得られた知識・経験を可能な限りドキュメントとして整理しています。',
  metadataBase: new URL('https://doboku-note.com'),
  openGraph: {
    title: 'doboku-note',
    description:
      '土木技術に関する仕事に携わる中で得られた知識・経験を可能な限りドキュメントとして整理しています。',
    siteName: 'doboku-note',
    locale: 'ja_JP',
    type: 'website',
  },
  alternates: {
    canonical: 'https://doboku-note.com',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/img/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* KaTeX CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css"
          integrity="sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM"
          crossOrigin="anonymous"
        />
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7995274743017484"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">{children}</div>
        <Footer />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8VXJ1RL1HG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8VXJ1RL1HG', { anonymize_ip: true });
          `}
        </Script>
      </body>
    </html>
  );
}
