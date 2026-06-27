// Search Option A — Editorial Native
// 単カラム 880px、現行スタイル踏襲。
// Sponsored result（誌面風に明示）+ 通常結果 + Post-results に関連書籍 + 有料note。

function SearchOptionA() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { SearchBox, FilterChips, ResultRow, Excerpt } = SearchShared;
  const { mockSearchQuery, mockSearchResults, mockPopularQueries, mockRelatedKeywords } = SearchMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const { IconArrow, IconHash, IconExternal, IconChevron, IconStar } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        <div className="max-w-[880px] mx-auto px-6 lg:px-10 py-10">
          {/* Breadcrumb */}
          <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
            <span>Home</span><span aria-hidden style={{ opacity: 0.6 }}>›</span><span>Search</span>
          </nav>

          <h1 className="font-serif-jp font-black text-[40px] tracking-tight mb-2" style={{ color: "var(--ink)" }}>記事検索</h1>
          <p className="text-[14px] mb-6" style={{ color: "var(--ink-muted)" }}>キーワードを入力して記事・キーワードページを探す</p>

          <div className="mb-5">
            <SearchBox query={mockSearchQuery} size="md" />
          </div>

          <div className="mb-8">
            <FilterChips active="civil" />
          </div>

          {/* Result summary */}
          <div className="flex items-end justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--rule)" }}>
            <div>
              <div className="font-serif-jp text-[20px] font-bold" style={{ color: "var(--ink)" }}>
                <span className="tabular-nums">7</span> 件の結果 <span className="font-mono text-[12px] font-normal ml-2" style={{ color: "var(--ink-muted)" }}>"{mockSearchQuery}"</span>
              </div>
              <div className="font-mono text-[10px] mt-1.5" style={{ color: "var(--ink-muted)" }}>検索時間 0.08秒 · sortBy: relevance</div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Page 1 / 1</div>
          </div>

          {/* Sponsored result (clearly labeled) — editorial styled */}
          <article className="relative p-5 mb-1 border" style={{ borderColor: "var(--premium-line)", background: "linear-gradient(180deg, #fffaf0 0%, #fff 100%)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border" style={{ borderColor: "var(--premium)", color: "var(--premium)" }}>広告 · Sponsored</span>
                <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--premium)" }}>編集部のおすすめ</span>
              </div>
              <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>Amazon.co.jp ↗</span>
            </div>
            <div className="flex gap-4">
              <BookCover book={mockBooks[0]} size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-serif-jp font-bold text-[20px] leading-snug mb-1" style={{ color: "var(--ink)" }}>
                  <a href="#" className="hover:underline">1級土木施工管理技士 第1次検定 完全攻略 2026</a>
                </h3>
                <div className="font-mono text-[10px] mb-2" style={{ color: "var(--ink-muted)" }}>受験対策研究会編 · 単行本 · 2026年版</div>
                <p className="text-[13px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
                  「<mark style={{ background: "#fff2a8", color: "#4a3d00", padding: "0 2px" }}>コンクリート</mark>の<mark style={{ background: "#fff2a8", color: "#4a3d00", padding: "0 2px" }}>配合</mark>設計」を含む第1次検定の全12分野を網羅。過去10年の出題傾向を踏まえた解説と、章末の確認問題で論点を定着。
                </p>
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <StarRow rating={4.6} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>4.6 (184)</span>
                  </div>
                  <div className="font-serif-jp font-black text-lg tabular-nums" style={{ color: "var(--ink)" }}>¥3,520</div>
                  <AmazonButton size="sm" />
                </div>
              </div>
            </div>
          </article>

          {/* Regular results */}
          <div className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
            {mockSearchResults.slice(0,3).map((r, i) => (
              <div key={r.slug} style={{ borderColor: "var(--rule-soft)" }}>
                <ResultRow r={r} ranked idx={i+1} />
              </div>
            ))}
          </div>

          {/* In-feed AdSense between results */}
          <div className="my-6 ad-slot" style={{ height: 120 }}>
            <div className="text-center">
              <div style={{ letterSpacing: "0.18em" }}>Google AdSense — In-feed</div>
              <div className="text-[11px] mt-1">Responsive</div>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
            {mockSearchResults.slice(3,7).map((r, i) => (
              <div key={r.slug} style={{ borderColor: "var(--rule-soft)" }}>
                <ResultRow r={r} ranked idx={i+4} />
              </div>
            ))}
          </div>

          {/* End of results — affiliate row */}
          <section className="mt-12 pt-8 border-t-2" style={{ borderColor: "var(--ink)" }}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Related references · 関連の参考書</div>
                <h2 className="font-serif-jp text-2xl font-black" style={{ color: "var(--ink)" }}>「コンクリート 配合設計」を深掘りする本</h2>
                <p className="text-[13px] mt-1.5" style={{ color: "var(--ink-muted)" }}>
                  検索結果に登場した論点を体系的に学べる参考書。<span className="pr-tag ml-1.5">PR · Amazon</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              {mockBooks.slice(0,3).map(b => (
                <a key={b.id} href="#" className="block bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="flex justify-center mb-3">
                    <BookCover book={b} size="md" />
                  </div>
                  <div className="font-serif-jp font-bold text-[13px] leading-snug mb-1.5" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <StarRow rating={b.rating} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</div>
                    <span className="font-mono text-[9px] uppercase tracking-widest underline" style={{ color: "var(--amazon)" }}>Amazon ↗</span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Paid note teaser — query-related */}
          <section className="mt-10 p-7 border-2" style={{ borderColor: "var(--premium-line)", background: "var(--premium-fill)" }}>
            <div className="flex items-start gap-5">
              <div className="shrink-0 w-[120px] h-[150px] flex items-center justify-center font-serif-jp font-black text-[56px] tabular-nums"
                style={{ background: "var(--ink)", color: "#fff" }}>04</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--premium)" }}>有料note · あなたの検索に関連</div>
                <h3 className="font-serif-jp font-black text-[22px] leading-tight mb-2" style={{ color: "var(--ink)" }}>
                  経験記述「品質管理」13テーマ
                </h3>
                <p className="text-[13px] leading-[1.9] mb-4" style={{ color: "var(--ink-body)" }}>
                  「コンクリート 配合設計」を検索したあなたへ。本誌のテーマ#03「コンクリート品質低下の防止」では、配合段階の管理項目と現場記述の論理構成を、実際の合格答案で解説しています。
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <a href="#" className="inline-flex items-center gap-2 px-5 py-2 font-mono uppercase tracking-widest text-[11px] font-bold"
                    style={{ background: "var(--premium)", color: "#fff" }}>¥1,480 で購入 <IconExternal className="w-3 h-3" /></a>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--premium)" }}>テーマ#03 サンプル →</a>
                  <span className="font-mono text-[10px] tabular-nums ml-auto" style={{ color: "var(--ink-muted)" }}>1,240+ 購入 · ★4.7</span>
                </div>
              </div>
            </div>
          </section>

          {/* Popular searches */}
          <section className="mt-12 pt-8 border-t" style={{ borderColor: "var(--rule-soft)" }}>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Popular searches · 人気の検索</div>
            <div className="flex flex-wrap gap-2">
              {mockPopularQueries.map(q => (
                <a key={q} href="#" className="inline-flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[12px]"
                  style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)", background: "#fff" }}>
                  <span style={{ color: "var(--ink-muted)" }}>›</span>
                  {q}
                </a>
              ))}
            </div>
          </section>

          {/* Bottom AdSense */}
          <div className="mt-10 ad-slot" style={{ height: 250 }}>
            <div className="text-center">
              <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
              <div className="text-[11px] mt-1">300 × 250 Rectangle</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

window.SearchOptionA = SearchOptionA;
