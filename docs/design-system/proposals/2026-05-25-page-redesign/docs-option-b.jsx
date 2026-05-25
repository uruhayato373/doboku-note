// Docs Option B — Sidebar-Heavy Monetization
// 本文は完全にクリーンに保ち、収益化はすべてサイドバーで実現。
// 「読みやすさ」を最大化しつつ、3つのスタック（note CTA / Amazon / AdSense）が常時 sticky 表示。

function DocsOptionB() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { articleMeta, articleToc, ArticleBody, AuthorCard } = DocsShared;
  const { mockBooks, mockPaidNotes, mockArticles } = MockData;
  const {
    IconHash, IconClock, IconArrow, IconExternal, IconChevron, IconPin, IconBook, IconStar, IconChart
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <div className="w-full pb-16">
        <div className="max-w-[1280px] mx-auto px-10 flex gap-8 relative">
          {/* Main — narrower so wider sidebar fits */}
          <main className="flex-1 min-w-0 py-10" style={{ maxWidth: 760 }}>
            <article className="bg-white border shadow-soft py-12 px-12" style={{ borderColor: "var(--rule-soft)" }}>
              <nav className="mb-6 font-mono text-[11px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
                <a href="#" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士</a>
                <span aria-hidden style={{ opacity: 0.6 }}>›</span>
                <span>教科書</span>
              </nav>
              <h1 className="font-serif-jp font-black text-[38px] leading-[1.25] tracking-tight" style={{ color: "var(--ink)" }}>
                {articleMeta.title}
              </h1>
              <div className="mt-5 mb-2 flex items-center gap-4 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                <span>公開 {articleMeta.publishedAt}</span>
                <span aria-hidden>·</span>
                <span>更新 {articleMeta.updatedAt}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1"><IconClock className="w-3 h-3" />読了 {articleMeta.readMin}分</span>
              </div>

              {/* Clean article body, no inline ads */}
              <ArticleBody />

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

            <AuthorCard />

            <section className="mt-10">
              <div className="flex items-end justify-between mb-5">
                <h2 className="font-serif-jp text-2xl font-black" style={{ color: "var(--ink)" }}>関連記事</h2>
                <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All →</a>
              </div>
              <ul className="bg-white border divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                {mockArticles.slice(1,5).map(a => (
                  <li key={a.slug} style={{ borderColor: "var(--rule-soft)" }}>
                    <a href="#" className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--accent-fill)]">
                      <span className="font-mono text-[10px] tabular-nums shrink-0 w-16" style={{ color: "var(--ink-muted)" }}>{a.date}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif-jp font-bold text-[14px] leading-snug truncate" style={{ color: "var(--ink)" }}>{a.title}</div>
                      </div>
                      <IconChevron className="w-4 h-4 shrink-0" style={{ color: "var(--ink-muted)" }} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          {/* Sidebar — wide, sticky monetization rail */}
          <aside className="w-[360px] shrink-0 py-10 hidden lg:block">
            <div className="sticky top-6 space-y-4">
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

              {/* Featured paid note — large/sticky */}
              <div className="border-2 p-5" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--premium)" }}>有料note · 関連マガジン</div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-14 h-20 flex items-center justify-center font-serif-jp font-black text-[28px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                  <h3 className="font-serif-jp font-black text-[15px] leading-tight" style={{ color: "var(--ink)" }}>経験記述「品質管理」13テーマ</h3>
                </div>
                <p className="text-[12px] leading-[1.8] mb-3" style={{ color: "var(--ink-body)" }}>
                  本記事の続編。第2次検定の合格論文 13 テーマ。配合・養生・寒中・暑中の各論点を網羅。
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--premium)" }}>¥1,480</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>1,240+ 購入 · ★4.7</span>
                </div>
                <a href="#" className="block w-full py-2 text-center font-mono uppercase tracking-widest text-[11px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>note で購入 →</a>
              </div>

              {/* Editor's pick book — featured */}
              <div className="bg-white border" style={{ borderColor: "var(--rule)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between" style={{ borderColor: "var(--rule)", color: "var(--accent)" }}>
                  <span className="flex items-center gap-1.5"><IconPin className="w-3 h-3" />本記事の決定版テキスト</span>
                  <span className="pr-tag">PR · Amazon</span>
                </div>
                <div className="p-4">
                  <div className="flex gap-3">
                    <BookCover book={mockBooks[2]} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-serif-jp font-bold text-[13px] leading-snug mb-1.5" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[2].title}</div>
                      <div className="font-mono text-[10px] mb-1.5" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].author}</div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRow rating={mockBooks[2].rating} />
                        <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].rating}</span>
                      </div>
                      <div className="font-serif-jp font-black text-base tabular-nums mb-2" style={{ color: "var(--ink)" }}>{mockBooks[2].price}</div>
                      <AmazonButton size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other related books */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  <span>関連の本</span>
                  <span className="pr-tag">PR</span>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockBooks.slice(0,3).map((b,i) => (
                    <li key={b.id}>
                      <a href="#" className="flex items-start gap-3 p-3 hover:bg-[var(--accent-fill)]">
                        <BookCover book={b} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[9px] tabular-nums mb-0.5" style={{ color: "var(--accent)" }}>#{String(i+1).padStart(2,"0")}</div>
                          <div className="font-serif-jp font-bold text-[11px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <StarRow rating={b.rating} />
                          </div>
                          <div className="font-mono text-[11px] tabular-nums mt-1" style={{ color: "var(--ink)" }}>{b.price}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AdSense rectangle */}
              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250</div>
                </div>
              </div>

              {/* Mini share / read stats */}
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Reading stats</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-l-2 pl-2" style={{ borderColor: "var(--accent)" }}>
                    <div className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--ink)" }}>12.4K</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Reads</div>
                  </div>
                  <div className="border-l-2 pl-2" style={{ borderColor: "var(--accent)" }}>
                    <div className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--ink)" }}>184</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Bookmarks</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

window.DocsOptionB = DocsOptionB;
