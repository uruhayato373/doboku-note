// Docs Option A — Editorial Inline Native
// 読書体験を最優先。本文への割り込みは最小限（中央1回 + 末尾CTA）。
// サイドバーには TOC + 有料note (既存) + 編集部の本棚。

function DocsOptionA() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { articleMeta, articleToc, ArticleBody, AuthorCard } = DocsShared;
  const { mockBooks, mockPaidNotes, mockArticles } = MockData;
  const {
    IconHash, IconClock, IconArrow, IconExternal, IconChevron, IconAward, IconPin, IconBook
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <div className="w-full pb-16">
        <div className="max-w-[1200px] mx-auto px-10 flex gap-8 relative">
          {/* Main */}
          <main className="flex-1 min-w-0 py-10">
            <article className="bg-white border shadow-soft py-12 px-12" style={{ borderColor: "var(--rule-soft)" }}>
              <nav className="mb-6 font-mono text-[11px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
                <a href="#" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士</a>
                <span aria-hidden style={{ opacity: 0.6 }}>›</span>
                <span>教科書</span>
              </nav>
              <h1 className="font-serif-jp font-black text-[40px] leading-[1.25] tracking-tight" style={{ color: "var(--ink)" }}>
                {articleMeta.title}
              </h1>
              <div className="mt-5 mb-2 flex items-center gap-4 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                <span>公開 {articleMeta.publishedAt}</span>
                <span aria-hidden>·</span>
                <span>更新 {articleMeta.updatedAt}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1"><IconClock className="w-3 h-3" />読了 {articleMeta.readMin}分</span>
              </div>

              {/* Article body — 1 inline ad in the middle, no section-by-section affiliate */}
              <ArticleBody withInlineAds />

              {/* End-of-article footer meta */}
              <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex flex-wrap gap-3">
                  {articleMeta.tags.map(t => (
                    <a key={t} href="#" className="font-mono text-[11px] flex items-center gap-1 px-2 py-1 border"
                      style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)" }}>
                      <IconHash className="w-2.5 h-2.5" />{t}
                    </a>
                  ))}
                </div>
              </div>
            </article>

            {/* End-of-article CTA stack — 1) Editor's pick book, 2) Paid note magazine */}
            <section className="mt-8 grid grid-cols-2 gap-5">
              {/* Editor's pick book */}
              <div className="bg-white border p-6" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                    <IconPin className="w-3 h-3" />本記事の決定版テキスト
                  </div>
                  <span className="pr-tag" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR · Amazon</span>
                </div>
                <div className="flex gap-4">
                  <BookCover book={mockBooks[2]} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-serif-jp font-bold text-[14px] leading-snug mb-1.5" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[2].title}</div>
                    <div className="font-mono text-[10px] mb-2" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].author}</div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <StarRow rating={mockBooks[2].rating} />
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].rating}</span>
                    </div>
                    <div className="font-serif-jp font-black text-lg tabular-nums mb-3" style={{ color: "var(--ink)" }}>{mockBooks[2].price}</div>
                    <AmazonButton size="sm" />
                  </div>
                </div>
              </div>

              {/* Paid note CTA — inline magazine card */}
              <div className="border-2 p-6 relative overflow-hidden" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>有料note · 関連マガジン</div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-[100px] h-[140px] flex items-center justify-center font-serif-jp font-black text-[48px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-jp font-black text-[16px] leading-tight mb-2" style={{ color: "var(--ink)" }}>経験記述「品質管理」13テーマ</h3>
                    <p className="text-[12px] leading-[1.85] mb-3" style={{ color: "var(--ink-body)" }}>
                      第2次検定の経験記述で「コンクリート配合」を題材にした合格答案 3 編を含む。
                    </p>
                    <div className="font-serif-jp font-black text-lg tabular-nums mb-3" style={{ color: "var(--premium)" }}>¥1,480</div>
                    <a href="#" className="inline-flex items-center gap-1 px-3 py-1.5 font-mono uppercase tracking-widest text-[10px] font-bold"
                      style={{ background: "var(--premium)", color: "#fff" }}>note で読む <IconExternal className="w-3 h-3" /></a>
                  </div>
                </div>
              </div>
            </section>

            {/* Author + Next articles */}
            <AuthorCard />

            <section className="mt-10">
              <div className="flex items-end justify-between mb-5">
                <h2 className="font-serif-jp text-2xl font-black" style={{ color: "var(--ink)" }}>次に読むべき記事</h2>
                <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All →</a>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {mockArticles.slice(1,5).map(a => (
                  <a key={a.slug} href="#" className="block bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5"
                        style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>{a.categoryLabel}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{a.date}</span>
                    </div>
                    <h3 className="font-serif-jp font-bold text-[16px] leading-snug" style={{ color: "var(--ink)" }}>{a.title}</h3>
                  </a>
                ))}
              </div>
            </section>
          </main>

          {/* Sidebar */}
          <aside className="w-[300px] shrink-0 py-10 hidden lg:block">
            <div className="sticky top-6 space-y-3">
              {/* Sidebar paid note (existing pattern) */}
              <div className="border-2 p-4" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>関連の有料note</div>
                <div className="flex items-start gap-2 mb-2">
                  <div className="shrink-0 w-10 h-14 flex items-center justify-center font-serif-jp font-black text-[20px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                  <div>
                    <div className="font-serif-jp font-black text-[12px] leading-tight" style={{ color: "var(--ink)" }}>経験記述「品質管理」13テーマ</div>
                    <div className="font-mono text-[10px] mt-1" style={{ color: "var(--premium)" }}>¥1,480</div>
                  </div>
                </div>
                <a href="#" className="block w-full py-1.5 text-center font-mono uppercase tracking-widest text-[10px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>note で読む →</a>
              </div>

              {/* TOC */}
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Table of Contents</div>
                <ol className="space-y-2 text-[12px]">
                  {articleToc.map(h => (
                    <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                      <a href={`#${h.id}`} className="hover:text-[var(--accent)] block leading-tight" style={{ color: h.id === "wc-ratio" ? "var(--ink)" : "var(--ink-body)", fontWeight: h.id === "wc-ratio" ? 700 : 400 }}>
                        <span className="font-mono text-[10px] tabular-nums mr-1.5" style={{ color: "var(--ink-muted)" }}>{h.num}</span>
                        {h.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Editor's shelf — small, related books */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  <span>Editor's shelf</span>
                  <span className="pr-tag">PR</span>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockBooks.slice(2,5).map(b => (
                    <li key={b.id}>
                      <a href="#" className="flex items-start gap-3 p-3">
                        <BookCover book={b} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-serif-jp font-bold text-[11px] leading-snug mb-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                          <div className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

window.DocsOptionA = DocsOptionA;
