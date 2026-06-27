// Docs Option C — Affiliate-First Inline (Contextual)
// 章ごとに「この章を深掘りする本」を提示。Amazon を最大化。
// 読書フローへの割り込みは増えるが、本の購買意欲が高いユーザーには高効率。

function DocsOptionC() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { articleMeta, articleToc, ArticleBody, AuthorCard } = DocsShared;
  const { mockBooks, mockPaidNotes, mockArticles } = MockData;
  const {
    IconHash, IconClock, IconArrow, IconExternal, IconChevron, IconPin, IconBook, IconStar, IconCheck
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <div className="w-full pb-16">
        <div className="max-w-[1200px] mx-auto px-10 flex gap-8 relative">
          <main className="flex-1 min-w-0 py-10">
            <article className="bg-white border shadow-soft py-12 px-12" style={{ borderColor: "var(--rule-soft)" }}>
              <nav className="mb-6 font-mono text-[11px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
                <a href="#" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士</a>
                <span aria-hidden style={{ opacity: 0.6 }}>›</span>
                <span>教科書</span>
              </nav>
              <h1 className="font-serif-jp font-black text-[40px] leading-[1.25] tracking-tight" style={{ color: "var(--ink)" }}>{articleMeta.title}</h1>
              <div className="mt-5 mb-2 flex items-center gap-4 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                <span>公開 {articleMeta.publishedAt}</span>
                <span aria-hidden>·</span>
                <span>更新 {articleMeta.updatedAt}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1"><IconClock className="w-3 h-3" />読了 {articleMeta.readMin}分</span>
              </div>

              {/* Inline section-by-section affiliate refs */}
              <ArticleBody withSectionAffiliate withInlineAffiliate />

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

            {/* End: 3-book comparison panel — high-converting affiliate */}
            <section className="mt-8">
              <div className="border-2" style={{ borderColor: "var(--ink)" }}>
                <div className="px-6 py-3 flex items-center justify-between" style={{ background: "var(--ink)", color: "#fff" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                    <IconBook className="w-3.5 h-3.5" />配合設計を学ぶ 3 冊比較
                  </div>
                  <span className="pr-tag" style={{ borderColor: "#fff", color: "#fff" }}>PR · Amazon</span>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
                        <th className="text-left p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>書籍</th>
                        <th className="text-left p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>位置づけ</th>
                        <th className="text-left p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>レベル</th>
                        <th className="text-left p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>評価</th>
                        <th className="text-left p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>価格</th>
                        <th className="text-right p-4 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { b: mockBooks[2], role: "決定版・示方書系", level: "★★★ 上級", note: "実務向けの最終リファレンス。" },
                        { b: mockBooks[0], role: "1次検定 完全攻略", level: "★★ 中級", note: "受験者の定番。配合は1章で網羅。" },
                        { b: mockBooks[5], role: "土質と材料の基礎", level: "★ 入門", note: "コンクリートと土の基礎を併せて。" },
                      ].map(({ b, role, level, note }, i) => (
                        <tr key={b.id} className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
                          <td className="p-4 align-top">
                            <div className="flex items-start gap-3">
                              <BookCover book={b} size="sm" />
                              <div className="min-w-0">
                                <div className="font-serif-jp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                                <div className="font-mono text-[10px] mt-1" style={{ color: "var(--ink-muted)" }}>{b.author}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>{role}</div>
                            <div className="text-[11px] mt-1 leading-[1.7]" style={{ color: "var(--ink-body)" }}>{note}</div>
                          </td>
                          <td className="p-4 align-top font-mono text-[11px]" style={{ color: "var(--ink)" }}>{level}</td>
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <StarRow rating={b.rating} />
                              <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating}</span>
                            </div>
                          </td>
                          <td className="p-4 align-top font-serif-jp font-black text-[15px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</td>
                          <td className="p-4 align-top text-right"><AmazonButton size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* In-article AdSense — bottom */}
            <div className="mt-8 ad-slot" style={{ height: 250 }}>
              <div className="text-center">
                <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                <div className="text-[11px] mt-1">Responsive</div>
              </div>
            </div>

            {/* Paid note CTA — full width prominent */}
            <section className="mt-8 p-7 border-2" style={{ borderColor: "var(--premium-line)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-[140px] h-[200px] flex items-center justify-center font-serif-jp font-black text-[64px] tabular-nums"
                  style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--premium)" }}>有料note · 関連マガジン</div>
                  <h3 className="font-serif-jp font-black text-[24px] leading-tight mb-3" style={{ color: "var(--ink)" }}>
                    経験記述「品質管理」13テーマ
                  </h3>
                  <p className="text-[14px] leading-[1.9] mb-4" style={{ color: "var(--ink-body)" }}>
                    本記事「コンクリート配合設計」を踏まえた第2次検定の合格答案 13 編。配合・養生・寒中・暑中まで、論点別にテンプレート化。
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 font-mono uppercase tracking-widest text-[11px] font-bold"
                      style={{ background: "var(--premium)", color: "#fff" }}>¥1,480 で購入 <IconExternal className="w-3 h-3" /></a>
                    <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--premium)" }}>サンプル →</a>
                    <span className="font-mono text-[10px] tabular-nums ml-auto" style={{ color: "var(--ink-muted)" }}>1,240+ 購入 · ★4.7</span>
                  </div>
                </div>
              </div>
            </section>

            <AuthorCard />
          </main>

          {/* Sidebar — TOC + note CTA only (rest are inline) */}
          <aside className="w-[300px] shrink-0 py-10 hidden lg:block">
            <div className="sticky top-6 space-y-3">
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Table of Contents</div>
                <ol className="space-y-2 text-[12px]">
                  {articleToc.map(h => (
                    <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                      <a href={`#${h.id}`} className="block leading-tight" style={{ color: h.id === "wc-ratio" ? "var(--ink)" : "var(--ink-body)", fontWeight: h.id === "wc-ratio" ? 700 : 400 }}>
                        <span className="font-mono text-[10px] tabular-nums mr-1.5" style={{ color: "var(--ink-muted)" }}>{h.num}</span>
                        {h.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-2 p-4" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>有料note · 関連</div>
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

              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250</div>
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

window.DocsOptionC = DocsOptionC;
