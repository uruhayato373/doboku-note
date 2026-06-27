// Option C — Magazine Cover
// 月刊誌の表紙のように、今月の有料 note Vol.X を主役に据えた最大コンバージョン型。
// ヒーロー = 表紙 + 目次。サブで Amazon 編集部の本棚。AdSense は誌面広告として配置。

function OptionC() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { mockArticles, mockBooks, mockPaidNotes } = MockData;
  const {
    IconArrow, IconBolt, IconHardHat, IconCap, IconFile, IconHash, IconClock,
    IconExternal, IconStar, IconLock, IconBook, IconAward, IconChevron, IconPin
  } = Icons;

  const cover = mockPaidNotes[0];
  const tocLines = [
    { tag: "Feature", title: "経験記述「品質管理」13テーマ", page: "P.04" },
    { tag: "Method", title: "合格答案の構造 — 状況・課題・対応の3層モデル", page: "P.22" },
    { tag: "Case", title: "添削事例 #07 軟弱地盤上の路体盛土", page: "P.41" },
    { tag: "Case", title: "添削事例 #11 トンネル覆工の品質管理", page: "P.58" },
    { tag: "Worksheet", title: "経験記述 600字 構成シート", page: "P.72" },
    { tag: "Appendix", title: "5年分の出題テーマ × 評価基準対応表", page: "P.84" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Issue masthead */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-8 pb-4">
          <div className="flex items-end justify-between border-b-2 pb-4 flex-wrap gap-3" style={{ borderColor: "var(--rule)" }}>
            <div>
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: "var(--ink-muted)" }}>doboku-note Monthly</div>
              <div className="font-serif-jp font-black text-[32px] leading-none mt-1" style={{ color: "var(--ink)" }}>Issue 04 — May 2026</div>
            </div>
            <div className="flex items-center gap-6 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
              <span>Vol. 04 / 12</span>
              <span>2026.05.10 公開</span>
              <span>編集部 N</span>
            </div>
          </div>
        </section>

        {/* The "cover" hero */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-12 gap-10 items-stretch">
            {/* Cover panel */}
            <div className="col-span-7 relative" style={{ background: "var(--ink)", color: "#fff", minHeight: 620 }}>
              {/* big background number */}
              <div aria-hidden className="absolute top-0 right-0 leading-none font-serif-jp font-black select-none pointer-events-none"
                style={{ fontSize: 520, color: "#1a1a1a", lineHeight: 0.78, transform: "translate(8%, -4%)" }}>
                04
              </div>
              <div className="relative h-full p-10 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: "var(--premium-fill)" }}>Premium Magazine</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif-jp font-black text-3xl tabular-nums">{cover.price}</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#9aa8b4" }}>tax in</span>
                  </div>
                </div>
                <div className="mt-auto pt-20">
                  <div className="spec-tag mb-4" style={{ color: "var(--premium-fill)" }}>Feature · 第2次検定 経験記述</div>
                  <h1 className="font-serif-jp font-black tracking-tight leading-[1.04] text-[72px]">
                    合格論文は、<br/>
                    <span style={{ color: "var(--premium-fill)" }}>「経験」</span>の<br/>
                    書き方で決まる。
                  </h1>
                  <p className="mt-6 text-[15px] leading-[1.95] max-w-[42ch]" style={{ color: "#cdd5dc" }}>
                    1級土木 第2次検定の経験記述で落ちる受験者は、ほぼ毎年6割を超えます。本誌は5年分の添削事例から、合格答案を構造化しました。
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <a href="#" className="inline-flex items-center gap-2 px-7 py-3 font-mono uppercase tracking-widest text-[12px] font-bold"
                      style={{ background: "var(--premium-fill)", color: "var(--ink)" }}>
                      note で購入する <IconExternal className="w-3 h-3" />
                    </a>
                    <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--premium-fill)" }}>
                      無料サンプル →
                    </a>
                  </div>
                  <div className="mt-6 flex items-center gap-6 font-mono text-[11px] tabular-nums" style={{ color: "#9aa8b4" }}>
                    <span className="flex items-center gap-1.5"><IconBook className="w-3 h-3" /> 92 pages</span>
                    <span aria-hidden>·</span>
                    <span>1,240+ 購入</span>
                    <span aria-hidden>·</span>
                    <span>★ 4.7 / 184 評価</span>
                  </div>
                </div>
              </div>
            </div>
            {/* TOC panel */}
            <aside className="col-span-5 flex flex-col">
              <div className="bg-white border p-7 flex-1" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-baseline justify-between mb-5 pb-3 border-b" style={{ borderColor: "var(--rule)" }}>
                  <div className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: "var(--accent)" }}>Contents</div>
                  <div className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>本号の目次</div>
                </div>
                <ol className="space-y-3">
                  {tocLines.map((t, i) => (
                    <li key={i} className="flex items-baseline gap-3">
                      <div className="font-mono text-[10px] tabular-nums w-6 shrink-0" style={{ color: "var(--accent)" }}>{String(i+1).padStart(2,"0")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{t.tag}</div>
                        <div className="font-serif-jp font-bold text-[15px] leading-snug" style={{ color: "var(--ink)" }}>{t.title}</div>
                      </div>
                      <div className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: "var(--ink-muted)" }}>{t.page}</div>
                    </li>
                  ))}
                </ol>
              </div>
              {/* Mini back-issues strip */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {mockPaidNotes.map((n, i) => (
                  <a key={n.vol} href="#" className="block bg-white border p-3" style={{ borderColor: "var(--rule-soft)", opacity: i === 0 ? 1 : 0.7 }}>
                    <div className="font-mono text-[10px] tabular-nums" style={{ color: "var(--premium)" }}>{n.vol}</div>
                    <div className="font-serif-jp font-bold text-[11px] mt-1 leading-snug line-clamp-2" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{n.title}</div>
                    <div className="font-mono text-[10px] mt-1 tabular-nums" style={{ color: "var(--ink-muted)" }}>{n.price}</div>
                  </a>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {/* 「今月の編集記事」 — magazine grid */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>This month · 本号の関連記事</div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>無料で読めるダイジェスト</h2>
              <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                Issue 04 の理解を深めるための、編集部の無料記事。
              </p>
            </div>
            <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All articles →</a>
          </div>
          <div className="grid grid-cols-3 gap-0 border" style={{ borderColor: "var(--rule)" }}>
            {/* Big lead article */}
            <a href="#" className="col-span-2 row-span-2 p-10 bg-white border-r relative" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>Lead · 1級土木施工</div>
              <h3 className="font-serif-jp font-black text-[40px] leading-[1.1] mb-5 max-w-[20ch]" style={{ color: "var(--ink)" }}>
                コンクリートの配合設計 — W/C比と単位水量の決め方
              </h3>
              <p className="text-[14px] leading-[1.95] max-w-[50ch]" style={{ color: "var(--ink-body)" }}>
                示方配合と現場配合のあいだに何があるのか。圧縮強度と耐久性を両立する W/C 比の見立てを、JIS と土木学会示方書の両面から整理する。
              </p>
              <div className="absolute bottom-10 left-10 flex items-center gap-3 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                <span>2026.05.16</span><span aria-hidden>·</span><span>12分</span><span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 underline" style={{ color: "var(--accent)" }}>Read article <IconArrow className="w-3 h-3" /></span>
              </div>
            </a>
            {mockArticles.slice(1,5).map((a, i) => (
              <a key={a.slug} href="#" className="p-6 bg-white border-b border-r" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--accent)" }}>{a.categoryLabel}</div>
                <h3 className="font-serif-jp font-bold text-[16px] leading-snug mb-3" style={{ color: "var(--ink)" }}>{a.title}</h3>
                <div className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{a.date} · {a.readMin}分</div>
              </a>
            ))}
          </div>
        </section>

        {/* Magazine full-page ad — AdSense styled as inset ad */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="grid grid-cols-12 gap-10 items-center">
            <div className="col-span-3 text-right">
              <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>Advertisement</div>
              <div className="font-serif-jp font-black text-2xl mt-1" style={{ color: "var(--ink)" }}>誌面広告</div>
              <div className="font-mono text-[10px] mt-2" style={{ color: "var(--ink-muted)" }}>Powered by Google AdSense</div>
            </div>
            <div className="col-span-9">
              <div className="ad-slot" style={{ height: 200 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense — Display</div>
                  <div className="text-[11px] mt-1">Responsive Banner</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The two exams — split tabloid */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="mb-8">
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>Columns · 連載</div>
            <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>対応する二つの試験</h2>
          </div>
          <div className="grid grid-cols-2 gap-0 border" style={{ borderColor: "var(--rule)" }}>
            {[
              { Ico: IconHardHat, label: "1級土木施工管理技士", en: "CCCE Grade 1", next: "2026年7月 第1次", count: "186 articles" },
              { Ico: IconCap, label: "技術士（総合技術監理部門）", en: "PE Comprehensive Management", next: "2026年7月 筆記", count: "101 articles / 412 keywords" },
            ].map((e, i) => (
              <a key={e.en} href="#" className="p-10 bg-white border-r last:border-r-0 group" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>Column 0{i+1}</div>
                  <div className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{e.count}</div>
                </div>
                <e.Ico className="w-12 h-12 mb-6" style={{ color: "var(--accent)" }} stroke={1.2} />
                <h3 className="font-serif-jp font-black text-[28px] leading-tight mb-2" style={{ color: "var(--ink)" }}>{e.label}</h3>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>{e.en}</div>
                <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--rule-soft)" }}>
                  <span className="font-mono text-[11px]" style={{ color: "var(--ink-body)" }}>{e.next}</span>
                  <IconArrow className="w-4 h-4" style={{ color: "var(--ink)" }} />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Editor's recommendation — Amazon affiliate as a full-page-ad style spread */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-12 gap-0 border" style={{ borderColor: "var(--rule)" }}>
            <div className="col-span-4 p-10" style={{ background: "var(--accent-fill)" }}>
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Editor's choice</div>
              <h2 className="font-serif-jp font-black text-[44px] leading-[1.1]" style={{ color: "var(--ink)" }}>
                編集部が選ぶ、<br/>今月の本棚。
              </h2>
              <p className="mt-6 text-[14px] leading-[1.9]" style={{ color: "var(--ink-body)" }}>
                Issue 04 のテーマに沿って、編集部 N が実際に手元で参照している参考書を 6 冊。
              </p>
              <div className="mt-6 pr-tag inline-block">PR · Amazon アソシエイト</div>
              <a href="#" className="block mt-8 font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--accent)" }}>
                All references → 
              </a>
            </div>
            <div className="col-span-8 p-10 bg-white">
              <div className="grid grid-cols-3 gap-6">
                {mockBooks.slice(0,6).map((b, i) => (
                  <a key={b.id} href="#" className="block group">
                    <div className="flex justify-center mb-3">
                      <BookCover book={b} size="md" />
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>#{String(i+1).padStart(2,"0")}</div>
                    <div className="font-serif-jp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</span>
                      <span className="font-mono text-[9px] uppercase tracking-widest underline" style={{ color: "var(--amazon)" }}>Amazon ↗</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Editor's letter + back issues */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14 border-t" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7">
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Editor's letter</div>
              <h2 className="font-serif-jp text-3xl font-black mb-5" style={{ color: "var(--ink)" }}>編集後記</h2>
              <p className="text-[15px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>
                Issue 04 を編集しながら、改めて第2次検定の難しさを実感しました。文章力ではなく、現場で何を考え、何を決めたかを再現する力が問われている。本誌の13テーマが、その「再現」の足場になれば幸いです。
              </p>
              <p className="mt-4 text-[15px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>
                次号 Issue 05 は、6月15日公開予定。テーマは「総監キーワード × 過去問」です。
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="avatar w-12 h-12 rounded-full">N</div>
                <div>
                  <div className="font-serif-jp font-bold text-[15px]" style={{ color: "var(--ink)" }}>編集部 N</div>
                  <div className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士 / 技術士（建設・総監）</div>
                </div>
              </div>
            </div>
            <aside className="col-span-5">
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-5" style={{ color: "var(--ink-muted)" }}>Back issues · バックナンバー</div>
              <ul className="space-y-3">
                {mockPaidNotes.map(n => (
                  <li key={n.vol}>
                    <a href="#" className="flex gap-4 p-4 border bg-white items-start" style={{ borderColor: "var(--rule-soft)" }}>
                      <div className="font-serif-jp font-black text-2xl tabular-nums shrink-0" style={{ color: "var(--premium)" }}>{n.vol.replace("Vol. ","")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif-jp font-bold text-[14px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{n.title}</div>
                        <div className="mt-2 flex items-center gap-3 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                          <span style={{ color: "var(--premium)" }} className="font-bold tabular-nums">{n.price}</span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">{n.buyers} 購入</span>
                        </div>
                      </div>
                      <IconChevron className="w-4 h-4 shrink-0" style={{ color: "var(--ink-muted)" }} />
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.OptionC = OptionC;
