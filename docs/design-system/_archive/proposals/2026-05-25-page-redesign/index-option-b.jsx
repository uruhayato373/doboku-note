// Option B — Learning Dashboard / Funnel
// 試験までのカウントダウンを軸に、「無料記事→参考書(Amazon)→過去問演習→有料note」の
// 学習ロードマップを可視化。各ステップに収益商品を自然に組み込む。

function OptionB() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { mockArticles, mockBooks, mockPaidNotes } = MockData;
  const {
    IconHardHat, IconCap, IconBook, IconArrow, IconStar, IconBolt, IconClock,
    IconCheck, IconLock, IconChevron, IconLayers, IconChart, IconFile, IconHash,
    IconExternal, IconTrend, IconPin, IconPlay, IconAward
  } = Icons;

  const days = 76;
  const steps = [
    { num: "01", label: "基礎を読む", sub: "無料記事 · 287本", status: "doing", Ic: IconBook, val: "68%", valLbl: "読了" },
    { num: "02", label: "参考書で深掘り", sub: "厳選テキスト", status: "todo", Ic: IconLayers, val: "0/3", valLbl: "推奨書" },
    { num: "03", label: "過去問演習", sub: "5年分 +解説", status: "todo", Ic: IconChart, val: "12%", valLbl: "正答率" },
    { num: "04", label: "経験記述で仕上げ", sub: "有料note", status: "locked", Ic: IconLock, val: "—", valLbl: "Premium" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero — countdown dashboard */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-1" style={{ background: "var(--accent)", color: "#fff" }}>Exam Countdown</span>
                <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士 第1次検定</span>
              </div>
              <h1 className="font-serif-jp font-black tracking-tight leading-[1.05] text-[var(--ink)] text-[88px] lg:text-[112px] tabular-nums">
                D−{days}<span className="font-mono text-3xl ml-3" style={{ color: "var(--ink-muted)" }}>日</span>
              </h1>
              <p className="mt-4 text-[16px] leading-[1.9] max-w-[58ch]" style={{ color: "var(--ink-body)" }}>
                次の試験まであと <strong style={{ color: "var(--ink)" }}>{days}日</strong>。doboku-note の学習ロードマップに沿って、今日の一歩を進めましょう。
              </p>
              <div className="mt-6 grid grid-cols-4 gap-4">
                {[
                  { k: "Articles read", v: "112 / 165" },
                  { k: "Past problems", v: "84 / 240" },
                  { k: "Mock score", v: "61%" },
                  { k: "Streak", v: "12日" },
                ].map(s => (
                  <div key={s.k} className="border-l-2 pl-3" style={{ borderColor: "var(--accent)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{s.k}</div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums mt-1" style={{ color: "var(--ink)" }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <aside className="col-span-4">
              <div className="bg-white border p-6 shadow-soft" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Today's recommended</div>
                <div className="flex items-start gap-2 mb-3">
                  <IconBolt className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                  <h3 className="font-serif-jp font-bold text-[18px] leading-snug" style={{ color: "var(--ink)" }}>
                    コンクリートの配合設計 — W/C比と単位水量の決め方
                  </h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] mb-4" style={{ color: "var(--ink-muted)" }}>
                  <span className="flex items-center gap-1"><IconClock className="w-3 h-3" /> 12分</span>
                  <span aria-hidden>·</span>
                  <span>第1次検定 頻出</span>
                </div>
                <a href="#" className="block w-full py-3 text-center font-mono uppercase tracking-widest text-[11px] font-semibold"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  <span className="inline-flex items-center gap-2"><IconPlay className="w-3 h-3" />読み始める</span>
                </a>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>Quick switch</div>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 border font-mono text-[11px]" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-fill)" }}>1級土木</button>
                    <button className="flex-1 px-3 py-2 border font-mono text-[11px]" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>総監</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Above-the-fold AdSense (clearly labeled, but slim) */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-2 pb-6">
          <div className="ad-slot" style={{ height: 90 }}>
            <div className="text-center">
              <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
              <div className="text-[11px] mt-1">728 × 90 Leaderboard</div>
            </div>
          </div>
        </section>

        {/* Learning Roadmap — 4-step funnel */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--accent)" }}>Roadmap · 学習ロードマップ</div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>合格までの4ステップ</h2>
              <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                doboku-note が推奨する学習順序。各ステップで使う教材を編集部が厳選しています。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0 border" style={{ borderColor: "var(--rule)" }}>
            {steps.map((s, i) => {
              const active = s.status === "doing";
              const locked = s.status === "locked";
              return (
                <div key={s.num} className="relative p-6 bg-white border-r last:border-r-0"
                  style={{ borderColor: "var(--rule-soft)", background: active ? "var(--accent-fill)" : "#fff", opacity: locked ? 0.7 : 1 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[11px] tracking-widest" style={{ color: locked ? "var(--ink-muted)" : "var(--accent)" }}>STEP {s.num}</div>
                    <div className="w-10 h-10 flex items-center justify-center"
                      style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--ink)", border: active ? "none" : "1px solid var(--rule-soft)" }}>
                      <s.Ic className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="font-serif-jp font-black text-xl mb-1" style={{ color: "var(--ink)" }}>{s.label}</div>
                  <div className="font-mono text-[11px] mb-4" style={{ color: "var(--ink-muted)" }}>{s.sub}</div>
                  <div className="pt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{s.valLbl}</div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums mt-1" style={{ color: locked ? "var(--ink-muted)" : "var(--ink)" }}>{s.val}</div>
                  </div>
                  {active && <div className="absolute -bottom-px left-0 right-0 h-1" style={{ background: "var(--accent)" }} />}
                </div>
              );
            })}
          </div>

          {/* Step 1 detail — current */}
          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-7 bg-white border p-7" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5" style={{ background: "var(--accent)", color: "#fff" }}>Now · Step 01</span>
                <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>基礎を読む</span>
              </div>
              <h3 className="font-serif-jp font-black text-xl mb-4" style={{ color: "var(--ink)" }}>このカテゴリの未読記事 (5本)</h3>
              <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                {mockArticles.slice(0,5).map((a, i) => (
                  <li key={a.slug} className="flex items-center gap-4 py-3" style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="font-mono text-[11px] tabular-nums w-6" style={{ color: "var(--ink-muted)" }}>{String(i+1).padStart(2,"0")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif-jp text-[15px] font-bold leading-snug" style={{ color: "var(--ink)" }}>{a.title}</div>
                      <div className="font-mono text-[10px] mt-1" style={{ color: "var(--ink-muted)" }}>{a.categoryLabel} · 読了 {a.readMin}分</div>
                    </div>
                    <button className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>読む</button>
                  </li>
                ))}
              </ul>
            </div>
            <aside className="col-span-5 bg-white border p-7 relative" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="absolute top-0 right-0 px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
                style={{ background: "var(--amazon)", color: "#fff" }}>Step 02 · Amazon</div>
              <div className="font-mono text-[10px] tracking-widest uppercase mb-3 mt-2" style={{ color: "var(--amazon)" }}>Next up · 推奨参考書 <span className="pr-tag ml-2" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR</span></div>
              <h3 className="font-serif-jp font-black text-xl mb-4" style={{ color: "var(--ink)" }}>無料記事だけでは届かない部分は、紙の参考書で補強。</h3>
              <div className="flex gap-4 mb-5">
                <BookCover book={mockBooks[0]} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-serif-jp font-bold text-[14px] leading-snug mb-2" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{mockBooks[0].title}</div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <StarRow rating={mockBooks[0].rating} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{mockBooks[0].rating} ({mockBooks[0].reviews})</span>
                  </div>
                  <div className="font-mono text-[12px] tabular-nums mb-3" style={{ color: "var(--ink)" }}>{mockBooks[0].price}</div>
                  <AmazonButton size="sm" />
                </div>
              </div>
              <div className="text-[11px] font-mono pt-3 border-t flex justify-between" style={{ color: "var(--ink-muted)", borderColor: "var(--rule-soft)" }}>
                <span>3冊セットで揃える</span>
                <a href="#" className="underline" style={{ color: "var(--amazon)" }}>合格教材セットを見る →</a>
              </div>
            </aside>
          </div>
        </section>

        {/* Step 04 — Premium paid note CTA (large, prominent) */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="relative overflow-hidden p-12" style={{ background: "var(--ink)", color: "#fff" }}>
            <div className="absolute top-0 right-0 px-3 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: "var(--premium)", color: "#fff" }}>Step 04 · Premium</div>
            <div className="grid grid-cols-12 gap-10 items-center">
              <div className="col-span-7">
                <div className="font-mono text-[11px] tracking-widest uppercase mb-4" style={{ color: "var(--premium-fill)" }}>有料note · 経験記述添削マガジン</div>
                <h2 className="font-serif-jp text-[44px] font-black leading-[1.15] mb-4">
                  経験記述で <span style={{ color: "var(--premium-fill)" }}>不合格を出さない</span>。
                </h2>
                <p className="text-[15px] leading-[1.95] max-w-[55ch]" style={{ color: "#cdd5dc" }}>
                  第2次検定の経験記述で落ちる受験者は、ほぼ毎年6割を超えます。当ノートの編集部が、過去5年分の添削事例から「合格答案の構造」を抽出し、テーマ別に13本のテンプレートとして公開しました。
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 max-w-[480px]">
                  {[["¥1,480","買い切り"],["1,240+","購入者"],["13本","テンプレ"]].map(([v,k]) => (
                    <div key={k}>
                      <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--premium-fill)" }}>{v}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: "#9aa8b4" }}>{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-center gap-3">
                  <a href="#" className="inline-flex items-center gap-2 px-6 py-3 font-mono uppercase tracking-widest text-[12px] font-bold"
                    style={{ background: "var(--premium)", color: "#fff" }}>note で購入する <IconExternal className="w-3 h-3" /></a>
                  <a href="#" className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "#cdd5dc" }}>サンプルを読む →</a>
                </div>
              </div>
              <div className="col-span-5">
                <div className="bg-white p-6 -rotate-1 shadow-lift" style={{ color: "var(--ink)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--premium)" }}>Vol. 04 · プレビュー</span>
                  </div>
                  <div className="font-serif-jp font-black text-xl mb-3" style={{ color: "var(--ink)" }}>テーマ #07 — 軟弱地盤上の路体盛土</div>
                  <p className="text-[13px] leading-[1.85] mb-3" style={{ color: "var(--ink-body)" }}>
                    本工事は、現道拡幅に伴うN値2〜4の軟弱層上への盛土であり、施工後の残留沈下と側方流動による品質低下が懸念された。
                  </p>
                  <p className="text-[13px] leading-[1.85] mb-3" style={{ color: "var(--ink-body)" }}>
                    そこで以下の3点を施工計画に反映した：
                  </p>
                  <ol className="text-[13px] leading-[1.85] space-y-1 pl-4 list-decimal" style={{ color: "var(--ink-body)" }}>
                    <li>サンドマット t=0.5m 敷設による排水促進と機械トラフィカビリティ確保</li>
                    <li>盛土材の段階載荷（1リフト 0.3m, 7日養生）</li>
                    <li>沈下板による1日1回計測と…</li>
                  </ol>
                  <div className="mt-4 pt-3 text-center font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)", borderTop: "1px dashed #ccc" }}>──── 続きは note で ────</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended set — Amazon affiliate carousel */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--amazon)" }}>Reference set <span className="pr-tag ml-2" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR · Amazon</span></div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>1級土木 合格者の教材セット</h2>
              <p className="text-[14px] mt-1.5 max-w-[58ch]" style={{ color: "var(--ink-muted)" }}>
                編集部の N が実際に使ったテキスト・問題集。3冊セットで体系・演習・直前対策を網羅します。
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>3冊合計</div>
              <div className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--ink)" }}>¥10,890</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {mockBooks.slice(0,3).map((b, i) => (
              <div key={b.id} className="bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>For Step {i === 0 ? "02 基礎" : i === 1 ? "02 演習" : "03 直前"}</div>
                  {b.badge && <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>{b.badge}</span>}
                </div>
                <div className="flex justify-center mb-4">
                  <BookCover book={b} size="lg" />
                </div>
                <div className="font-serif-jp font-bold text-[14px] leading-snug mb-2" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                <div className="font-mono text-[11px] mb-2" style={{ color: "var(--ink-muted)" }}>{b.author}</div>
                <div className="flex items-center gap-2 mb-3">
                  <StarRow rating={b.rating} />
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating} ({b.reviews})</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-serif-jp font-black text-lg tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</div>
                  <AmazonButton size="sm" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* In-feed AdSense between sections */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-4">
          <div className="ad-slot" style={{ height: 100 }}>
            <div className="text-center">
              <div style={{ letterSpacing: "0.18em" }}>Google AdSense — In-feed Native</div>
              <div className="text-[11px] mt-1">Responsive</div>
            </div>
          </div>
        </section>

        {/* Latest articles compact list */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>最新の記事</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-muted)" }}>過去 30 日で更新された記事</p>
            </div>
            <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All articles →</a>
          </div>
          <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
            {mockArticles.map((a, i) => (
              <a key={a.slug} href="#" className="flex items-center gap-5 px-6 py-4 border-b last:border-b-0 hover:bg-[var(--accent-fill)]"
                style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] tabular-nums w-12" style={{ color: "var(--ink-muted)" }}>{a.date}</div>
                <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 shrink-0"
                  style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>{a.categoryLabel}</span>
                <div className="font-serif-jp font-bold text-[15px] flex-1 min-w-0 leading-snug truncate" style={{ color: "var(--ink)" }}>{a.title}</div>
                <div className="font-mono text-[10px] flex items-center gap-1 shrink-0" style={{ color: "var(--ink-muted)" }}>
                  <IconClock className="w-3 h-3" />{a.readMin}分
                </div>
                <IconChevron className="w-4 h-4 shrink-0" style={{ color: "var(--ink-muted)" }} />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.OptionB = OptionB;
