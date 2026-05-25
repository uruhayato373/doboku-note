// Search Option D — Knowledge Panel
// クエリが既知のキーワード（"コンクリート" "経験記述" 等）と一致したとき、
// 上部に「決定版パネル」を表示。用語定義 + 決定版の参考書(Amazon) + 関連有料note を集約。
// Google の Knowledge Panel に着想を得た、トラストの高い収益化フォーマット。

function SearchOptionD() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { SearchBox, ResultRow, FilterChips } = SearchShared;
  const { mockSearchQuery, mockSearchResults, mockRelatedKeywords } = SearchMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const { IconArrow, IconHash, IconExternal, IconBook, IconShield, IconPin, IconChevron, IconCheck, IconAward, IconLayers } = Icons;

  const panelFacts = [
    { k: "JIS 規格", v: "JIS A 5308" },
    { k: "示方書", v: "土木学会 コンクリート示方書 [施工編]" },
    { k: "主成分", v: "セメント + 水 + 骨材 + 混和材料" },
    { k: "強度発現", v: "材齢 28日（標準）" },
    { k: "頻出出題", v: "第1次検定 全11問中 2〜3問" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-4">
          <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
            <span>Home</span><span aria-hidden style={{ opacity: 0.6 }}>›</span><span>Search</span><span aria-hidden style={{ opacity: 0.6 }}>›</span><span>コンクリート 配合設計</span>
          </nav>
          <SearchBox query={mockSearchQuery} size="lg" />
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <div className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }} className="tabular-nums">7</strong> 件 ·
              <strong style={{ color: "var(--accent)" }} className="ml-1">Knowledge match</strong> 「コンクリート」
            </div>
          </div>
        </section>

        {/* Knowledge Panel — top-of-page */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6">
          <div className="grid grid-cols-12 gap-0 border-2 bg-white" style={{ borderColor: "var(--ink)" }}>
            {/* Panel header strip */}
            <div className="col-span-12 px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)", background: "var(--ink)", color: "#fff" }}>
              <div className="flex items-center gap-2">
                <IconShield className="w-4 h-4" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Knowledge Panel · 編集部による定義</span>
              </div>
              <div className="font-mono text-[10px] tabular-nums">Last verified 2026.05.16</div>
            </div>

            {/* Left: definition + facts */}
            <div className="col-span-7 p-8 border-r" style={{ borderColor: "var(--rule)" }}>
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="font-serif-jp font-black text-[48px] leading-none tracking-tight" style={{ color: "var(--ink)" }}>コンクリート</h2>
                <span className="font-mono text-[14px] tabular-nums" style={{ color: "var(--ink-muted)" }}>concrete</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-5" style={{ color: "var(--accent)" }}>土木材料 · 1級土木施工 / 技術士 共通</div>

              <p className="text-[15px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
                セメント・水・骨材・混和材料を練り混ぜ、水和反応で硬化させた複合材料。
                土木構造物の主要構造材料として用いられ、<strong style={{ color: "var(--ink)" }}>配合設計</strong>・<strong style={{ color: "var(--ink)" }}>品質管理</strong>・<strong style={{ color: "var(--ink)" }}>養生</strong>の各段階で JIS と土木学会示方書による標準が定められている。
              </p>

              {/* Facts table */}
              <table className="w-full text-[13px] mb-6">
                <tbody>
                  {panelFacts.map(f => (
                    <tr key={f.k} className="border-b last:border-b-0" style={{ borderColor: "var(--rule-soft)" }}>
                      <td className="py-2 pr-4 font-mono text-[10px] uppercase tracking-widest align-top whitespace-nowrap" style={{ color: "var(--ink-muted)", width: 120 }}>{f.k}</td>
                      <td className="py-2" style={{ color: "var(--ink)" }}>{f.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Related sub-keywords */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>下位概念 · 関連用語</div>
                <div className="flex flex-wrap gap-1.5">
                  {mockRelatedKeywords.slice(0,10).map(k => (
                    <a key={k} href="#" className="inline-flex items-center px-2 py-1 font-mono text-[11px] border"
                      style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)", background: "#fff" }}>
                      {k}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: canonical reference + paid note */}
            <aside className="col-span-5 p-6 space-y-5" style={{ background: "var(--bg)" }}>
              {/* Canonical Amazon book */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                    <IconAward className="w-3 h-3" />決定版の参考書
                  </div>
                  <span className="pr-tag">PR · Amazon</span>
                </div>
                <div className="flex gap-4">
                  <BookCover book={mockBooks[2]} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-jp font-bold text-[15px] leading-snug mb-1.5" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[2].title}</h3>
                    <div className="font-mono text-[10px] mb-2" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].author} · 2023年版</div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <StarRow rating={mockBooks[2].rating} />
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{mockBooks[2].rating} ({mockBooks[2].reviews})</span>
                    </div>
                    <div className="font-serif-jp font-black text-lg tabular-nums mb-2" style={{ color: "var(--ink)" }}>{mockBooks[2].price}</div>
                    <AmazonButton size="sm" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t font-mono text-[10px] flex items-center justify-between" style={{ borderColor: "var(--rule-soft)" }}>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--ink-muted)" }}>
                    <IconCheck className="w-3 h-3" style={{ color: "var(--accent)" }} />編集部 N が現在参照中
                  </span>
                  <a href="#" className="underline" style={{ color: "var(--accent)" }}>レビュー →</a>
                </div>
              </div>

              {/* Related paid note */}
              <div className="border-2 p-5" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--premium)" }}>関連の有料note</div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-14 h-20 flex items-center justify-center font-serif-jp font-black text-[28px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-jp font-black text-[15px] leading-tight mb-1" style={{ color: "var(--ink)" }}>
                      経験記述「品質管理」13テーマ
                    </h3>
                    <div className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>テーマ#03でコンクリート配合を扱う</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--premium)" }}>¥1,480</span>
                  <a href="#" className="flex-1 text-center py-2 font-mono uppercase tracking-widest text-[10px] font-bold"
                    style={{ background: "var(--premium)", color: "#fff" }}>note で購入 →</a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Filter chips inline */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-2">
          <FilterChips active="civil" />
        </section>

        {/* Results — 2 columns */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex items-end justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--rule)" }}>
            <div className="font-serif-jp text-[20px] font-bold" style={{ color: "var(--ink)" }}>
              当ノート内の関連記事
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>7件 / sort: relevance</div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Main results */}
            <div className="col-span-8">
              <div className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                {mockSearchResults.slice(0,3).map((r, i) => (
                  <div key={r.slug} style={{ borderColor: "var(--rule-soft)" }}>
                    <ResultRow r={r} ranked idx={i+1} />
                  </div>
                ))}
              </div>

              {/* Mid-feed AdSense */}
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
            </div>

            {/* Right rail — more references */}
            <aside className="col-span-4 space-y-5">
              {/* Section header */}
              <div className="font-mono text-[10px] uppercase tracking-widest pb-2 border-b" style={{ borderColor: "var(--rule)", color: "var(--accent)" }}>
                More references · 関連の参考書 <span className="pr-tag ml-1.5" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR</span>
              </div>

              {/* Books stacked */}
              <ul className="space-y-3">
                {mockBooks.slice(1,5).map((b, i) => (
                  <li key={b.id}>
                    <a href="#" className="flex items-start gap-3 p-3 bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                      <BookCover book={b} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[9px] tabular-nums mb-1" style={{ color: "var(--ink-muted)" }}>Reference #{String(i+2).padStart(2,"0")}</div>
                        <div className="font-serif-jp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <StarRow rating={b.rating} />
                          <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</span>
                          <span className="font-mono text-[9px] uppercase tracking-widest underline" style={{ color: "var(--amazon)" }}>Amazon ↗</span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>

              {/* Sidebar AdSense */}
              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250</div>
                </div>
              </div>

              {/* Past issues — paid note backlist */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "var(--rule-soft)", color: "var(--premium)" }}>
                  Paid notes · 関連マガジン
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockPaidNotes.map(n => (
                    <li key={n.vol}>
                      <a href="#" className="flex gap-3 p-3 items-start hover:bg-[var(--accent-fill)]">
                        <div className="font-serif-jp font-black text-lg tabular-nums shrink-0" style={{ color: "var(--premium)" }}>{n.vol.replace("Vol. ","")}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif-jp font-bold text-[12px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{n.title}</div>
                          <div className="font-mono text-[10px] mt-1" style={{ color: "var(--premium)" }}>{n.price}</div>
                        </div>
                      </a>
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

window.SearchOptionD = SearchOptionD;
