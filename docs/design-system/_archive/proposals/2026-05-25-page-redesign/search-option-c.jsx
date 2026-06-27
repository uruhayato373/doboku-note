// Search Option C — Search Hub (Discovery-First)
// 検索 = 受動的な絞り込みではなく、能動的な「発見」のゲートウェイ。
// クエリ未入力時のゼロステートを主役にし、人気検索 / 試験ステージ別 / 編集部の本棚 を統合。

function SearchOptionC() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { SearchBox } = SearchShared;
  const { mockSearchQuery, mockSearchResults, mockPopularQueries, mockRelatedKeywords } = SearchMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const {
    IconArrow, IconHash, IconExternal, IconChevron, IconHardHat, IconCap, IconBook,
    IconStar, IconTrend, IconBolt, IconClock, IconLayers, IconPin, IconFile
  } = Icons;

  const examTracks = [
    { Ic: IconHardHat, label: "1級土木施工管理技士", queries: ["第1次検定 過去問", "経験記述 品質管理", "コンクリート 配合"], count: 186 },
    { Ic: IconCap, label: "技術士（総監）", queries: ["リスクマトリクス", "ライフサイクルコスト", "社会環境管理"], count: 101 },
  ];

  const themes = [
    { label: "コンクリート", count: 28, hot: true },
    { label: "土工・盛土", count: 22, hot: false },
    { label: "施工管理", count: 31, hot: true },
    { label: "経験記述", count: 14, hot: true },
    { label: "舗装", count: 18, hot: false },
    { label: "河川・砂防", count: 12, hot: false },
    { label: "トンネル", count: 9, hot: false },
    { label: "橋梁", count: 11, hot: false },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero — large search hero */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-14 pb-10">
          <div className="text-center max-w-[820px] mx-auto">
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>doboku-note Search</div>
            <h1 className="font-serif-jp font-black text-[64px] tracking-tight leading-[1.05] mb-4" style={{ color: "var(--ink)" }}>
              287本の記事から、<br/>
              <span style={{ background: "linear-gradient(transparent 70%, #fff2a8 70%)" }}>あなたの論点を探す。</span>
            </h1>
            <p className="text-[16px] leading-[1.9] mb-8" style={{ color: "var(--ink-body)" }}>
              キーワード・タグ・キーワード辞典の全文検索。試験論点と現場の用語、両方から引けます。
            </p>
            <SearchBox filled={false} size="lg" />
            <div className="mt-4 flex items-center justify-center gap-4 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
              <span><IconFile className="w-3 h-3 inline mr-1" />287 articles</span>
              <span>·</span>
              <span><IconHash className="w-3 h-3 inline mr-1" />412 keywords</span>
              <span>·</span>
              <span>更新 2026.05.16</span>
            </div>
          </div>
        </section>

        {/* Above-the-fold AdSense — subtle, after hero */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-8">
          <div className="ad-slot" style={{ height: 90 }}>
            <div className="text-center">
              <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
              <div className="text-[11px] mt-1">728 × 90</div>
            </div>
          </div>
        </section>

        {/* Discover panels — 3-column hub */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-10">
          <div className="grid grid-cols-12 gap-6">
            {/* Popular queries with trending */}
            <div className="col-span-4 bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="flex items-center gap-2 mb-5">
                <IconTrend className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <h2 className="font-serif-jp font-black text-[18px]" style={{ color: "var(--ink)" }}>人気の検索</h2>
              </div>
              <ol className="space-y-3">
                {mockPopularQueries.slice(0,7).map((q, i) => (
                  <li key={q} className="flex items-start gap-3 group cursor-pointer">
                    <div className="font-serif-jp font-black text-lg tabular-nums w-5 shrink-0" style={{ color: i < 3 ? "var(--accent)" : "var(--ink-muted)" }}>{String(i+1).padStart(2,"0")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif-jp font-bold text-[14px] leading-snug group-hover:underline" style={{ color: "var(--ink)" }}>{q}</div>
                      <div className="font-mono text-[10px] mt-0.5 tabular-nums" style={{ color: "var(--ink-muted)" }}>
                        {String(2400 - i * 230).replace(/(\d)(?=(\d{3})+$)/g, '$1,')} searches · 7d
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* By exam */}
            <div className="col-span-4 bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="flex items-center gap-2 mb-5">
                <IconLayers className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <h2 className="font-serif-jp font-black text-[18px]" style={{ color: "var(--ink)" }}>試験から探す</h2>
              </div>
              <div className="space-y-4">
                {examTracks.map(t => (
                  <div key={t.label} className="p-4 border" style={{ borderColor: "var(--rule-soft)", background: "var(--bg)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <t.Ic className="w-5 h-5" style={{ color: "var(--accent)" }} stroke={1.5} />
                        <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>{t.label}</div>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{t.count}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.queries.map(q => (
                        <a key={q} href="#" className="inline-flex items-center font-mono text-[10px] px-2 py-1 border"
                          style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)", background: "#fff" }}>
                          {q}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By theme */}
            <div className="col-span-4 bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="flex items-center gap-2 mb-5">
                <IconHash className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <h2 className="font-serif-jp font-black text-[18px]" style={{ color: "var(--ink)" }}>テーマから探す</h2>
              </div>
              <ul className="space-y-2">
                {themes.map(t => (
                  <li key={t.label}>
                    <a href="#" className="flex items-center justify-between p-2.5 border hover:bg-[var(--accent-fill)]"
                      style={{ borderColor: "var(--rule-soft)" }}>
                      <div className="flex items-center gap-2">
                        <IconHash className="w-3 h-3" style={{ color: "var(--ink-muted)" }} />
                        <span className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>{t.label}</span>
                        {t.hot && <span className="font-mono text-[9px] uppercase tracking-widest px-1 py-0.5" style={{ background: "var(--accent)", color: "#fff" }}>HOT</span>}
                      </div>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{t.count}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* "Discover via books" — Editor's Shelf hero strip */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>Search via books · 本から論点を探す</div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>編集部の本棚</h2>
              <p className="text-[13px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                参考書のページから、関連する当ノートの記事へ。<span className="pr-tag ml-1.5">PR · Amazon</span>
              </p>
            </div>
            <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All references →</a>
          </div>
          <div className="grid grid-cols-6 gap-5">
            {mockBooks.slice(0,6).map((b, i) => (
              <a key={b.id} href="#" className="block group">
                <div className="relative mb-3">
                  <BookCover book={b} size="md" />
                  {b.badge && (
                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                      style={{ background: "var(--amazon)", color: "#fff" }}>{b.badge}</div>
                  )}
                </div>
                <div className="font-serif-jp font-bold text-[12px] leading-snug mb-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                <div className="flex items-center gap-1.5 mb-1">
                  <StarRow rating={b.rating} />
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating}</span>
                </div>
                <div className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</div>
              </a>
            ))}
          </div>
        </section>

        {/* Featured paid note — premium gateway */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="grid grid-cols-12 gap-0 border-2" style={{ borderColor: "var(--ink)" }}>
            <div className="col-span-5 p-10" style={{ background: "var(--ink)", color: "#fff" }}>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--premium-fill)" }}>Premium Magazine</div>
              <h2 className="font-serif-jp font-black text-[40px] leading-[1.1] mb-4">
                検索では<br/>たどりつけない<br/>合格論文の構造。
              </h2>
              <p className="text-[14px] leading-[1.9]" style={{ color: "#cdd5dc" }}>
                第2次検定の経験記述で落ちる受験者の6割が、検索キーワードの選び方を間違えている。Issue 04 はその構造を 13 テーマで解説します。
              </p>
            </div>
            <div className="col-span-7 p-10 bg-white">
              <div className="flex items-start gap-6">
                <div className="shrink-0 w-[150px] h-[210px] flex items-center justify-center font-serif-jp font-black text-[88px] tabular-nums"
                  style={{ background: "var(--premium-fill)", color: "var(--ink)" }}>04</div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>Vol. 04 · 2026.05.10</div>
                  <h3 className="font-serif-jp font-black text-[24px] leading-tight mb-3" style={{ color: "var(--ink)" }}>
                    経験記述「品質管理」13テーマ
                  </h3>
                  <ul className="space-y-1 mb-4 text-[12px]" style={{ color: "var(--ink-body)" }}>
                    {["テーマ#01 軟弱地盤上の路体盛土", "テーマ#03 コンクリート品質低下の防止", "テーマ#07 寒中コンクリートの管理", "テーマ#11 トンネル覆工の品質管理"].map(t => (
                      <li key={t} className="flex gap-2"><span style={{ color: "var(--premium)" }}>›</span>{t}</li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-3 flex-wrap pt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                    <span className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--ink)" }}>¥1,480</span>
                    <a href="#" className="inline-flex items-center gap-2 px-5 py-2 font-mono uppercase tracking-widest text-[11px] font-bold"
                      style={{ background: "var(--premium)", color: "#fff" }}>note で購入 <IconExternal className="w-3 h-3" /></a>
                    <span className="font-mono text-[10px] tabular-nums ml-auto" style={{ color: "var(--ink-muted)" }}>1,240+ 購入 · ★4.7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* If user searched something — collapsed results preview */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>Recent example · 最近の検索例</div>
              <h2 className="font-serif-jp text-2xl font-black" style={{ color: "var(--ink)" }}>
                "コンクリート 配合設計" の検索結果
              </h2>
              <p className="text-[13px] mt-1.5" style={{ color: "var(--ink-muted)" }}>7件ヒット。上位3件の概要。</p>
            </div>
            <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>View all results →</a>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {mockSearchResults.slice(0,3).map((r, i) => (
              <a key={r.slug} href="#" className="block bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[9px] tabular-nums px-1.5 py-0.5"
                    style={{ background: "var(--accent-fill)", color: "var(--accent)" }}>#{String(i+1).padStart(2,"0")}</span>
                  <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5"
                    style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>{r.categoryLabel}</span>
                </div>
                <h3 className="font-serif-jp font-bold text-[16px] leading-snug mb-2" style={{ color: "var(--ink)" }}>{r.title}</h3>
                <p className="text-[12px] leading-[1.8] line-clamp-2"
                  style={{ color: "var(--ink-body)" }}
                  dangerouslySetInnerHTML={{ __html: r.excerpt.replace(/<mark>/g, '<mark style="background: #fff2a8; color: #4a3d00;">') }} />
                <div className="mt-3 font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                  {r.date} · {r.readMin}分
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.SearchOptionC = SearchOptionC;
