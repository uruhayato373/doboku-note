import Link from "next/link";
import categoriesData from "@/config/categories.json";
import { CategoryDef, getCategoryHubPath } from "@/lib/categories";

const categories = (categoriesData as CategoryDef[]).filter((category) => category.visible !== false);

export default function Footer() {
  return (
    <footer className="border-t border-[var(--rule-soft)] bg-[var(--paper)] mt-10 transition-colors duration-300">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* ブランド情報 */}
          <div className="col-span-2">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-black tracking-tight text-[var(--ink)]">doboku</span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)] tracking-widest uppercase">— note</span>
            </Link>
            <p className="mt-3 text-[var(--ink-muted)] text-[13px] leading-relaxed max-w-[40ch]">
              土木系資格試験の対策ノート。1級土木施工管理技士および技術士（総合技術監理部門）の学習コンテンツを公開。
            </p>
          </div>

          {/* カテゴリ */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] mb-3">Categories</div>
            <ul className="space-y-2">
              {categories.map(cat => (
                <li key={cat.slug}>
                  <Link
                    href={getCategoryHubPath(cat.slug)}
                    className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* サイト情報 */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] mb-3">Site</div>
            <ul className="space-y-2">
              <li>
                <Link href="/standards" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  基準類・仕様書
                </Link>
              </li>
              <li>
                <Link href="/topics" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  テーマ別索引
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-flex min-h-11 items-center text-[var(--ink-body)] hover:text-[var(--accent)] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-8 pt-4 border-t border-[var(--rule-soft)] text-[12px] text-[var(--ink-muted)] leading-relaxed max-w-[60ch]">
          当サイトは成果報酬型広告（アフィリエイトプログラム）を利用しています。
        </p>

        <div className="mt-4 flex justify-between text-[11px] font-mono text-[var(--ink-muted)] flex-wrap gap-2">
          <span>© {new Date().getFullYear()} doboku-note</span>
          <span>Built with Next.js · Tailwind · MDX</span>
        </div>
      </div>
    </footer>
  );
}
