// Option D — Hybrid Compact
// ファーストビュー高密度・3カラム情報レイアウト。新聞紙面 × ダッシュボードのハイブリッド。
// メインカラムに記事、左サイドに学習ナビ、右サイドに収益商品（Amazon + 有料note + AdSense）を縦集約。

function OptionD() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { mockArticles, mockBooks, mockPaidNotes } = MockData;
  const {
    IconArrow, IconHardHat, IconCap, IconClock, IconHash, IconBolt, IconPin,
    IconExternal, IconChevron, IconBook, IconStar, IconAward, IconTrend, IconLock, IconFile
  } = Icons;

  const trending = [
    { rank: 1, title: "コンクリート配合設計 — W/C比", views: "12.4K", trend: "+38%" },
    { rank: 2, title: "経験記述「品質管理」の書き出し", views: "9.8K", trend: "+22%" },
    { rank: 3, title: "総監キーワード「リスクマトリクス」", views: "7.1K", trend: "+15%" },
    { rank: 4, title: "アスファルト舗装 締固め度の判定", views: "6.4K", trend: "+11%" },
    { rank: 5, title: "土留め工 背面土圧の見方", views: "5.2K", trend: "+8%" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Compact masthead — newspaper style */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-8 pb-4">
          <div className="border-y-2 py-4" style={{ borderColor: "var(--ink)" }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-baseline gap-4">
                <h1 className="font-serif-jp font-black text-[28px] leading-none" style={{ color: "var(--ink)" }}>
                  土木の現場と試験を、ひとつのノートに。
                </h1>
              </div>
              <div className="flex items-center gap-5 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                <span className="flex items-center gap-1.5"><IconFile className="w-3 h-3" /> 287 articles</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1.5"><IconHash className="w-3 h-3" /> 412 keywords</span>
                <span aria-hidden>·</span>
                <span>D−76 / 1級土木 第1次</span>
                <span aria-hidden>·</span>
                <span>2026.05.16</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3-column tabloid layout */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT — learning nav */}
            <aside className="col-span-3 space-y-5">
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between"
                  style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  <span>Exam Tracks</span>
                  <span style={{ color: "var(--accent)" }}>2 active</span>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {[
                    { Ic: IconHardHat, label: "1級土木施工管理技士", sub: "186 / D−76", active: true },
                    { Ic: IconCap, label: "技術士 総合技術監理", sub: "101 / D−134", active: false },
                  ].map(t => (
                    <li key={t.label} className="px-4 py-3 flex items-start gap-3" style={{ borderColor: "var(--rule-soft)", background: t.active ? "var(--accent-fill)" : "transparent" }}>
                      <t.Ic className="w-5 h-5 mt-0.5 shrink-0" style={{ color: t.active ? "var(--accent)" : "var(--ink-muted)" }} stroke={1.5} />
                      <div className="flex-1 min-w-0">
                        <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>{t.label}</div>
                        <div className="font-mono text-[10px] tabular-nums mt-0.5" style={{ color: t.active ? "var(--accent)" : "var(--ink-muted)" }}>{t.sub}</div>
                      </div>
                      {t.active && <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: "var(--accent)" }} />}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick links */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  Study Tools
                </div>
                <ul className="divide-y text-[13px]" style={{ borderColor: "var(--rule-soft)" }}>
                  {[
                    "過去問演習 (240問)",
                    "キーワード辞典 (412)",
                    "経験記述テンプレ",
                    "用語ランダム出題",
                    "計算問題ドリル",
                  ].map(l => (
                    <li key={l} className="px-4 py-2.5 flex items-center justify-between hover:bg-[var(--accent-fill)] cursor-pointer">
                      <span style={{ color: "var(--ink)" }}>{l}</span>
                      <IconChevron className="w-3.5 h-3.5" style={{ color: "var(--ink-muted)" }} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trending — small ranked list */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center gap-2"
                  style={{ borderColor: "var(--rule-soft)", color: "var(--accent)" }}>
                  <IconTrend className="w-3 h-3" /><span>Trending · 7 days</span>
                </div>
                <ol className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {trending.map(t => (
                    <li key={t.rank} className="px-4 py-2.5 flex items-start gap-3">
                      <div className="font-serif-jp font-black text-lg tabular-nums shrink-0 w-5" style={{ color: t.rank <= 3 ? "var(--accent)" : "var(--ink-muted)" }}>{t.rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif-jp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)" }}>{t.title}</div>
                        <div className="font-mono text-[10px] mt-1 tabular-nums" style={{ color: "var(--ink-muted)" }}>
                          {t.views} reads · <span style={{ color: "var(--accent)" }}>{t.trend}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>

            {/* CENTER — main editorial feed */}
            <div className="col-span-6 space-y-6">
              {/* Lead */}
              <article className="bg-white border p-7" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5"
                    style={{ background: "var(--ink)", color: "#fff" }}>Today's Lead</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>2026.05.16 · 12分</span>
                </div>
                <h2 className="font-serif-jp font-black text-[40px] leading-[1.12] mb-4" style={{ color: "var(--ink)" }}>
                  コンクリートの配合設計 — W/C比と単位水量の決め方
                </h2>
                <p className="text-[15px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>
                  示方配合と現場配合のあいだに何があるのか。圧縮強度と耐久性を両立する W/C 比の見立てを、JIS と土木学会示方書の両面から整理する。第1次検定では「単位水量」と「空気量」の組み合わせが頻出論点。
                </p>
                <div className="mt-5 flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="flex flex-wrap gap-3">
                    {["コンクリート","配合設計","品質管理"].map(t => (
                      <span key={t} className="font-mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
                        <IconHash className="w-2.5 h-2.5" />{t}
                      </span>
                    ))}
                  </div>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                    Read article <IconArrow className="w-3 h-3" />
                  </a>
                </div>
              </article>

              {/* Native AdSense — looks like a card but labeled */}
              <div className="border p-5 relative" style={{ borderColor: "#dadada", background: "#fbfbfa" }}>
                <div className="absolute top-2 right-3 font-mono text-[9px] uppercase tracking-widest" style={{ color: "#999" }}>広告 · AdSense</div>
                <div className="ad-slot" style={{ height: 110, border: "none" }}>
                  <div className="text-center">
                    <div style={{ letterSpacing: "0.18em" }}>In-feed Native</div>
                    <div className="text-[11px] mt-1">Responsive</div>
                  </div>
                </div>
              </div>

              {/* Article rows — compact */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>Latest in 1級土木施工</div>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All →</a>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockArticles.slice(1,5).map(a => (
                    <li key={a.slug}>
                      <a href="#" className="flex items-start gap-5 px-6 py-4 hover:bg-[var(--accent-fill)]">
                        <div className="font-mono text-[10px] tabular-nums w-16 shrink-0 pt-1" style={{ color: "var(--ink-muted)" }}>{a.date}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif-jp font-bold text-[16px] leading-snug" style={{ color: "var(--ink)" }}>{a.title}</div>
                          <div className="mt-1.5 flex gap-3 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            <span>{a.categoryLabel}</span>
                            <span aria-hidden>·</span>
                            <span>{a.readMin}分</span>
                            {a.tags.map(t => (
                              <span key={t} className="flex items-center gap-0.5"><IconHash className="w-2.5 h-2.5" />{t}</span>
                            ))}
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mid-feed AdSense — slim banner */}
              <div className="ad-slot" style={{ height: 90 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense — Display</div>
                  <div className="text-[11px] mt-1">728 × 90</div>
                </div>
              </div>

              {/* Editorial pull — paid note teaser */}
              <article className="border-2 p-7 relative bg-white" style={{ borderColor: "var(--premium-line)" }}>
                <div className="absolute -top-3 left-6 px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
                  style={{ background: "var(--premium)", color: "#fff" }}>編集部からのお知らせ · 有料note 新刊</div>
                <div className="flex items-start gap-6 mt-3">
                  <div className="shrink-0 w-[140px] h-[180px] flex items-center justify-center font-serif-jp font-black text-[64px] tabular-nums"
                    style={{ background: "var(--ink)", color: "#fff" }}>
                    04
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: "var(--premium)" }}>Vol. 04 · 2026.05.10</div>
                    <h3 className="font-serif-jp font-black text-[26px] leading-tight mb-3" style={{ color: "var(--ink)" }}>
                      経験記述「品質管理」13テーマ
                    </h3>
                    <p className="text-[14px] leading-[1.9] mb-4" style={{ color: "var(--ink-body)" }}>
                      第2次検定の経験記述で落ちる受験者は、ほぼ毎年6割を超えます。本誌は5年分の添削事例から、合格答案の構造を抽出し、テーマ別に13本のテンプレートとして公開しました。
                    </p>
                    <div className="flex items-center gap-4">
                      <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 font-mono uppercase tracking-widest text-[11px] font-bold"
                        style={{ background: "var(--premium)", color: "#fff" }}>¥1,480 で購入 <IconExternal className="w-3 h-3" /></a>
                      <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--premium)" }}>サンプル →</a>
                      <span className="font-mono text-[10px] tabular-nums ml-auto" style={{ color: "var(--ink-muted)" }}>1,240+ 購入 · ★4.7</span>
                    </div>
                  </div>
                </div>
              </article>

              {/* More articles list */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>Latest in 技術士 総監</div>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All →</a>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {[mockArticles[2], mockArticles[4]].map(a => (
                    <li key={a.slug}>
                      <a href="#" className="flex items-start gap-5 px-6 py-4 hover:bg-[var(--accent-fill)]">
                        <div className="font-mono text-[10px] tabular-nums w-16 shrink-0 pt-1" style={{ color: "var(--ink-muted)" }}>{a.date}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif-jp font-bold text-[16px] leading-snug" style={{ color: "var(--ink)" }}>{a.title}</div>
                          <div className="mt-1.5 flex gap-3 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            <span>{a.categoryLabel}</span>
                            <span aria-hidden>·</span>
                            <span>{a.readMin}分</span>
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* RIGHT — monetization rail */}
            <aside className="col-span-3 space-y-5">
              {/* Editor pick book */}
              <div className="bg-white border" style={{ borderColor: "var(--rule)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between"
                  style={{ borderColor: "var(--rule)", color: "var(--accent)" }}>
                  <span className="flex items-center gap-1.5"><IconPin className="w-3 h-3" />Editor's Pick</span>
                  <span className="pr-tag">PR</span>
                </div>
                <div className="p-4 text-center">
                  <div className="flex justify-center mb-3">
                    <BookCover book={mockBooks[0]} size="lg" />
                  </div>
                  <div className="font-serif-jp font-bold text-[13px] leading-snug mb-1.5 px-2" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[0].title}</div>
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <StarRow rating={mockBooks[0].rating} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{mockBooks[0].rating}</span>
                  </div>
                  <div className="font-serif-jp font-black text-xl tabular-nums mb-3" style={{ color: "var(--ink)" }}>{mockBooks[0].price}</div>
                  <AmazonButton label="Amazon で見る" size="sm" />
                </div>
              </div>

              {/* Sidebar AdSense */}
              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250</div>
                </div>
              </div>

              {/* Paid note magazine subscribe */}
              <div className="border-2 p-5" style={{ borderColor: "var(--premium)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 100%)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--premium)" }}>Premium · note 定期購読</div>
                <h3 className="font-serif-jp font-black text-[20px] leading-snug mb-3" style={{ color: "var(--ink)" }}>
                  毎月、合格論文を1本。
                </h3>
                <p className="text-[12px] leading-[1.85] mb-4" style={{ color: "var(--ink-body)" }}>
                  経験記述・添削事例・キーワード整理を月1冊。バックナンバー全12号も読み放題。
                </p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--premium)" }}>¥980</span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>/月</span>
                </div>
                <a href="#" className="block w-full py-2.5 text-center font-mono uppercase tracking-widest text-[11px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>note で定期購読 →</a>
                <div className="mt-3 font-mono text-[10px] text-center" style={{ color: "var(--ink-muted)" }}>初月無料 · いつでも解約可</div>
              </div>

              {/* Mini Amazon list */}
              <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="px-4 py-3 border-b font-mono text-[10px] uppercase tracking-widest flex items-center justify-between"
                  style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                  <span>Editor's shelf</span>
                  <span className="pr-tag">PR · Amazon</span>
                </div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockBooks.slice(1,4).map((b, i) => (
                    <li key={b.id}>
                      <a href="#" className="flex items-start gap-3 p-3">
                        <BookCover book={b} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[9px] tabular-nums" style={{ color: "var(--accent)" }}>#{String(i+2).padStart(2,"0")}</div>
                          <div className="font-serif-jp font-bold text-[12px] leading-snug mt-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                          <div className="font-mono text-[10px] tabular-nums mt-1" style={{ color: "var(--ink)" }}>{b.price}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Editor mini card */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--ink-muted)" }}>About Editor</div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="avatar w-12 h-12 rounded-full text-lg">N</div>
                  <div>
                    <div className="font-serif-jp font-bold text-[14px]" style={{ color: "var(--ink)" }}>編集部 N</div>
                    <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>1級土木 / 技術士 総監</div>
                  </div>
                </div>
                <p className="text-[12px] leading-[1.8]" style={{ color: "var(--ink-body)" }}>
                  土木コンサル勤務。日々の学習・実務メモを編集して当ノートに公開しています。
                </p>
                <a href="#" className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                  About → 
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.OptionD = OptionD;
