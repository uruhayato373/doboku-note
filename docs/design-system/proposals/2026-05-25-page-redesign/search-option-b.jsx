// Search Option B — Faceted + Right Rail
// 3カラム 1280px。
// 左 = フィルタ（カテゴリ/タグ/期間/ソート）、中央 = 結果、右 = Amazon/AdSense/有料note 縦集約。

function SearchOptionB() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { SearchBox, ResultRow, Excerpt } = SearchShared;
  const { mockSearchQuery, mockSearchResults, mockPopularQueries, mockRelatedKeywords } = SearchMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const { IconArrow, IconHash, IconExternal, IconChevron, IconHardHat, IconCap, IconBook, IconCheck, IconStar, IconPin } = Icons;

  const facets = {
    category: [
      { id: "civil", label: "1級土木施工管理技士", Ic: IconHardHat, count: 6 },
      { id: "pe", label: "技術士（総監）", Ic: IconCap, count: 0 },
      { id: "keyword", label: "キーワード", Ic: IconBook, count: 1 },
    ],
    tags: [
      { label: "コンクリート", count: 6, on: true },
      { label: "配合設計", count: 3, on: true },
      { label: "品質管理", count: 4, on: false },
      { label: "設計", count: 2, on: false },
      { label: "施工", count: 2, on: false },
      { label: "材料", count: 1, on: false },
      { label: "試験", count: 1, on: false },
    ],
    period: [
      { label: "過去 7日", count: 1 },
      { label: "過去 30日", count: 5, on: true },
      { label: "過去 90日", count: 7 },
      { label: "すべて", count: 7 },
    ],
    sort: ["関連度", "新着", "閲覧数"],
  };

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Search bar — full width */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-6">
          <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
            <span>Home</span><span aria-hidden style={{ opacity: 0.6 }}>›</span><span>Search</span>
          </nav>
          <SearchBox query={mockSearchQuery} size="lg" />
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }} className="tabular-nums">7</strong> 件の結果 ·
              検索時間 <span className="tabular-nums">0.08</span>s ·
              "{mockSearchQuery}"
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Sort</span>
              <select className="font-mono text-[12px] border px-2 py-1" style={{ borderColor: "var(--rule-soft)" }} defaultValue="関連度">
                {facets.sort.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* 3 columns */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-12">
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT — facets */}
            <aside className="col-span-3 space-y-5">
              {/* Category */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  Category
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {facets.category.map(c => {
                    const on = c.id === "civil";
                    const disabled = c.count === 0;
                    return (
                      <li key={c.id} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[var(--accent-fill)]"
                        style={{ opacity: disabled ? 0.4 : 1, background: on ? "var(--accent-fill)" : "transparent" }}>
                        <div className="w-4 h-4 border flex items-center justify-center shrink-0"
                          style={{ borderColor: on ? "var(--accent)" : "var(--rule-soft)", background: on ? "var(--accent)" : "#fff" }}>
                          {on && <IconCheck className="w-3 h-3" style={{ color: "#fff" }} />}
                        </div>
                        <c.Ic className="w-4 h-4" style={{ color: on ? "var(--accent)" : "var(--ink-muted)" }} stroke={1.5} />
                        <span className="flex-1 text-[13px]" style={{ color: "var(--ink)" }}>{c.label}</span>
                        <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{c.count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Tags */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  <span>Tags</span>
                  <button className="font-mono text-[10px]" style={{ color: "var(--accent)" }}>2 selected · クリア</button>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {facets.tags.map(t => (
                    <li key={t.label} className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-[var(--accent-fill)]"
                      style={{ background: t.on ? "var(--accent-fill)" : "transparent" }}>
                      <div className="w-4 h-4 border flex items-center justify-center shrink-0"
                        style={{ borderColor: t.on ? "var(--accent)" : "var(--rule-soft)", background: t.on ? "var(--accent)" : "#fff" }}>
                        {t.on && <IconCheck className="w-3 h-3" style={{ color: "#fff" }} />}
                      </div>
                      <IconHash className="w-3 h-3" style={{ color: "var(--ink-muted)" }} />
                      <span className="flex-1 text-[13px]" style={{ color: "var(--ink)" }}>{t.label}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{t.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Period */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  Period
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {facets.period.map(p => (
                    <li key={p.label} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[var(--accent-fill)]"
                      style={{ background: p.on ? "var(--accent-fill)" : "transparent" }}>
                      <div className="w-3 h-3 rounded-full border shrink-0"
                        style={{ borderColor: p.on ? "var(--accent)" : "var(--rule-soft)", background: p.on ? "radial-gradient(circle, var(--accent) 35%, #fff 40%)" : "#fff" }} />
                      <span className="flex-1 text-[13px]" style={{ color: "var(--ink)" }}>{p.label}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reset */}
              <button className="w-full py-2.5 font-mono text-[10px] uppercase tracking-widest border"
                style={{ borderColor: "var(--rule)", color: "var(--ink)", background: "#fff" }}>
                すべてのフィルタを解除
              </button>
            </aside>

            {/* CENTER — results */}
            <div className="col-span-6">
              {/* Sponsored result inline */}
              <article className="p-5 mb-5 border" style={{ borderColor: "var(--premium-line)", background: "linear-gradient(180deg, #fffaf0 0%, #fff 100%)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border" style={{ borderColor: "var(--premium)", color: "var(--premium)" }}>広告 · Sponsored</span>
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>Amazon.co.jp ↗</span>
                </div>
                <div className="flex gap-4">
                  <BookCover book={mockBooks[0]} size="sm" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-jp font-bold text-[17px] leading-snug mb-1" style={{ color: "var(--ink)" }}>
                      1級土木施工管理技士 第1次検定 完全攻略 2026
                    </h3>
                    <p className="text-[12px] leading-[1.8] mb-2" style={{ color: "var(--ink-body)" }}>
                      コンクリート配合設計を含む全12分野を網羅。過去10年の出題傾向に対応。
                    </p>
                    <div className="flex items-center gap-3">
                      <StarRow rating={4.6} />
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>4.6 (184)</span>
                      <span className="font-mono text-[12px] tabular-nums font-bold" style={{ color: "var(--ink)" }}>¥3,520</span>
                      <AmazonButton size="sm" />
                    </div>
                  </div>
                </div>
              </article>

              {/* Regular results */}
              <div className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                {mockSearchResults.slice(0,4).map((r, i) => (
                  <div key={r.slug} className="px-1" style={{ borderColor: "var(--rule-soft)" }}>
                    <ResultRow r={r} ranked idx={i+1} />
                  </div>
                ))}
              </div>

              {/* In-feed Amazon — native style */}
              <div className="my-6 p-5 border" style={{ borderColor: "var(--rule-soft)", background: "#fbfaf6" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--amazon)" }}>
                    Editor's Pick <span className="pr-tag ml-2" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {mockBooks.slice(0,3).map(b => (
                    <a key={b.id} href="#" className="flex gap-3 items-start">
                      <BookCover book={b} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-serif-jp font-bold text-[12px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <StarRow rating={b.rating} />
                        </div>
                        <div className="font-mono text-[11px] tabular-nums mt-1" style={{ color: "var(--ink)" }}>{b.price}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                {mockSearchResults.slice(4,7).map((r, i) => (
                  <div key={r.slug} className="px-1" style={{ borderColor: "var(--rule-soft)" }}>
                    <ResultRow r={r} ranked idx={i+5} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center gap-2">
                {[1,2,3].map(p => (
                  <button key={p} className="w-9 h-9 font-mono text-[12px] tabular-nums border"
                    style={{
                      borderColor: p === 1 ? "var(--ink)" : "var(--rule-soft)",
                      background: p === 1 ? "var(--ink)" : "#fff",
                      color: p === 1 ? "#fff" : "var(--ink-body)",
                    }}>{p}</button>
                ))}
                <button className="px-3 h-9 font-mono text-[11px] uppercase tracking-widest border" style={{ borderColor: "var(--rule-soft)", background: "#fff" }}>
                  Next →
                </button>
              </div>
            </div>

            {/* RIGHT — monetization rail */}
            <aside className="col-span-3 space-y-5">
              {/* Search-aware paid note */}
              <div className="border-2 p-5" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>関連の有料note</div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-12 h-16 flex items-center justify-center font-serif-jp font-black text-[24px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                  <h3 className="font-serif-jp font-black text-[15px] leading-tight" style={{ color: "var(--ink)" }}>
                    経験記述「品質管理」13テーマ
                  </h3>
                </div>
                <p className="text-[11px] leading-[1.8] mb-3" style={{ color: "var(--ink-body)" }}>
                  テーマ#03で「コンクリート配合段階の管理項目」を解説。
                </p>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--premium)" }}>¥1,480</span>
                  <span className="font-mono text-[9px]" style={{ color: "var(--ink-muted)" }}>買い切り</span>
                </div>
                <a href="#" className="block w-full py-2 text-center font-mono uppercase tracking-widest text-[10px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>note で購入 →</a>
              </div>

              {/* Editor pick book */}
              <div className="bg-white border" style={{ borderColor: "var(--rule)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between" style={{ borderColor: "var(--rule)", color: "var(--accent)" }}>
                  <span className="flex items-center gap-1.5"><IconPin className="w-3 h-3" />Top reference</span>
                  <span className="pr-tag">PR</span>
                </div>
                <div className="p-4 text-center">
                  <div className="flex justify-center mb-3">
                    <BookCover book={mockBooks[0]} size="md" />
                  </div>
                  <div className="font-serif-jp font-bold text-[12px] leading-snug mb-1.5 px-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[0].title}</div>
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <StarRow rating={mockBooks[0].rating} />
                  </div>
                  <div className="font-serif-jp font-black text-lg tabular-nums mb-3" style={{ color: "var(--ink)" }}>{mockBooks[0].price}</div>
                  <AmazonButton size="sm" />
                </div>
              </div>

              {/* Sidebar AdSense */}
              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250</div>
                </div>
              </div>

              {/* Related keywords */}
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>関連キーワード</div>
                <div className="flex flex-wrap gap-1.5">
                  {mockRelatedKeywords.map(k => (
                    <a key={k} href="#" className="inline-flex items-center px-2 py-1 font-mono text-[11px] border"
                      style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)" }}>
                      {k}
                    </a>
                  ))}
                </div>
              </div>

              {/* Saved searches */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  Recent searches
                </div>
                <ul className="divide-y text-[12px]" style={{ borderColor: "var(--rule-soft)" }}>
                  {["コンクリート 配合設計", "経験記述 品質管理", "土留め 背面土圧"].map(q => (
                    <li key={q} className="px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-[var(--accent-fill)]">
                      <span style={{ color: "var(--ink-muted)" }}>›</span>
                      <span style={{ color: "var(--ink-body)" }}>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.SearchOptionB = SearchOptionB;
