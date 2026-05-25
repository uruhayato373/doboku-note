// Option A — Editorial Native
// 現行の編集記事スタイル/紙面感を保ったまま収益化を「編集記事の一部」として自然統合。
// 広告 = 編集記事のような紙面オブジェクトとして扱い、ノイズを最小化。

function OptionA() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { mockArticles, mockBooks, mockPaidNotes } = MockData;
  const {
    IconNotebook, IconFile, IconHash, IconCal, IconHardHat, IconCap, IconArrow, IconStar,
    IconBook, IconBolt, IconAward, IconQuote, IconExternal, IconClock, IconPin
  } = Icons;

  const pickArticle = mockPaidNotes[0];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* HERO — minimal, editorial */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-14 pb-8">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>
              <IconNotebook className="w-3 h-3" />
              doboku-note
            </span>
            <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>土木系資格試験 対策ノート</span>
          </div>
          <h1 className="font-serif-jp font-black tracking-tight leading-[1.18] text-[var(--ink)] text-[56px] lg:text-[64px] max-w-[22ch]">
            土木の現場と試験を、ひとつのノートに。
          </h1>
          <p className="mt-6 text-[17px] leading-[1.95] max-w-[62ch]" style={{ color: "var(--ink-body)" }}>
            <strong style={{ color: "var(--ink)" }}>1級土木施工管理技士</strong> および <strong style={{ color: "var(--ink)" }}>技術士（総合技術監理部門）</strong> の試験対策を中心とした学習ノート。現場経験に裏打ちされた設計・施工の知見を、体系的な読み物としてお届けします。
          </p>
          <div className="mt-6 flex items-center gap-5 flex-wrap font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
            <span className="flex items-center gap-1.5"><IconFile className="w-3 h-3" /> 287 articles</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5"><IconHash className="w-3 h-3" /> 412 keywords</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5"><IconCal className="w-3 h-3" /> 更新 2026.05.16</span>
          </div>
        </section>

        {/* "今月の一冊" — affiliate woven into editorial format */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="border-t border-b py-10" style={{ borderColor: "var(--rule)" }}>
            <div className="grid grid-cols-12 gap-10 items-start">
              <div className="col-span-3 flex justify-center">
                <BookCover book={mockBooks[0]} size="xl" />
              </div>
              <div className="col-span-9">
                <div className="flex items-center gap-3 mb-4">
                  <span className="spec-tag" style={{ color: "var(--accent)" }}>Editor's Pick · 今月の一冊</span>
                  <span className="pr-tag">PR</span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>2026.05</span>
                </div>
                <h2 className="font-serif-jp font-black text-[32px] leading-[1.25] mb-3" style={{ color: "var(--ink)" }}>
                  第1次検定の伸び悩みを解いた、定番テキストの新版。
                </h2>
                <p className="text-[15px] leading-[1.95] mb-5 max-w-[60ch]" style={{ color: "var(--ink-body)" }}>
                  受験対策研究会編『1級土木施工管理技士 第1次検定 完全攻略 2026』。過去10年の出題傾向を踏まえた整理が秀逸で、当ノートの解説と相互参照しやすい構成です。<strong style={{ color: "var(--ink)" }}>第3章「土工」と第7章「品質管理」</strong>は特に試験直前の総復習に向きます。
                </p>
                <div className="flex items-center gap-6 mb-5 flex-wrap">
                  <div>
                    <div className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>Rating</div>
                    <div className="flex items-center gap-2">
                      <StarRow rating={4.6} />
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--ink)" }}>4.6 / 184 reviews</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>List price</div>
                    <div className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--ink)" }}>¥3,520</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <AmazonButton label="Amazon で見る" />
                  <button className="inline-flex items-center gap-2 px-4 py-2 font-mono uppercase tracking-widest text-[12px] border"
                    style={{ borderColor: "var(--rule)", color: "var(--ink)" }}>
                    楽天ブックス
                    <IconExternal className="w-3 h-3" />
                  </button>
                  <a href="#" className="font-mono text-[11px] underline ml-2" style={{ color: "var(--accent)" }}>編集部レビューを読む →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 試験カード (existing structure) */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="mb-8">
            <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>対応する二つの試験</h2>
            <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-muted)" }}>現場と試験を往復する、体系的な学習コンテンツ</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { Ico: IconHardHat, label: "1級土木施工管理技士", en: "CCCE Grade 1", sub: "第1次・第2次検定 完全対策", desc: "土木工事の施工計画・品質管理・安全管理を体系的に整理。過去問題、キーワード解説、記述式の要点を収録。", next: "2026年7月 第1次 / 10月 第2次", stats: [["記事","186"],["過去問","94"],["教科書","32"]] },
              { Ico: IconCap, label: "技術士（総合技術監理部門）", en: "PE Comprehensive Management", sub: "筆記・口頭試験 論文対策", desc: "5つの管理技術（経済性・人的資源・情報・安全・社会環境）のキーワード集。各概念の定義・要点・過去問リンクを収録。", next: "2026年7月 筆記 / 12月 口頭", stats: [["記事","101"],["キーワード","412"],["過去問","58"]] },
            ].map(e => (
              <a key={e.label} href="#" className="group block bg-white border p-8 transition-all hover:shadow-lift hover:-translate-y-0.5"
                style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="w-14 h-14 flex items-center justify-center" style={{ background: "var(--accent-fill)", color: "var(--accent)" }}>
                    <e.Ico className="w-7 h-7" stroke={1.5} />
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>{e.en}</div>
                    <div className="font-mono text-[10px] mt-1.5" style={{ color: "var(--ink-body)" }}>{e.next}</div>
                  </div>
                </div>
                <h3 className="font-serif-jp font-black text-2xl leading-tight mb-1.5" style={{ color: "var(--ink)" }}>{e.label}</h3>
                <div className="text-[13px] mb-4" style={{ color: "var(--ink-muted)" }}>{e.sub}</div>
                <p className="text-[14px] leading-[1.85] mb-5" style={{ color: "var(--ink-body)" }}>{e.desc}</p>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t mb-5" style={{ borderColor: "var(--rule-soft)" }}>
                  {e.stats.map(([k,v]) => (
                    <div key={k}>
                      <div className="font-serif-jp font-black text-xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</div>
                      <div className="font-mono text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--ink-muted)" }}>{k}</div>
                    </div>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--ink)" }}>
                  <span>Read the notes</span>
                  <IconArrow className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Editorial AdSense — styled as a "Sponsored note" reflecting the editorial format */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6">
          <div className="ad-slot" style={{ height: 140 }}>
            <div className="text-center">
              <div className="text-[10px]" style={{ color: "var(--ink-muted)" }}>Google AdSense — Display Responsive</div>
              <div className="text-[13px] mt-1" style={{ color: "var(--ink-muted)", letterSpacing: "0.1em" }}>728 × 90 / Responsive Banner</div>
            </div>
          </div>
        </section>

        {/* 最新記事 with in-feed paid note inserted */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>最新の記事</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-muted)" }}>現場と参考書から抽出した論点を、定期的に更新</p>
            </div>
            <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All articles →</a>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {mockArticles.slice(0,3).map(a => (
              <a key={a.slug} href="#" className="group block bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5"
                    style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>{a.categoryLabel}</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{a.date}</span>
                </div>
                <h3 className="font-serif-jp font-bold text-lg leading-snug" style={{ color: "var(--ink)" }}>{a.title}</h3>
                <div className="flex gap-3 mt-3 flex-wrap">
                  {a.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
                      <IconHash className="w-2.5 h-2.5" />{t}
                    </span>
                  ))}
                </div>
              </a>
            ))}

            {/* In-feed: paid note (Vol 04) — styled exactly like an article card but with Premium pill */}
            <a href="#" className="group block bg-white border p-6 relative overflow-hidden"
              style={{ borderColor: "var(--premium-line)", background: "linear-gradient(180deg, #fffaf0 0%, #fff 100%)" }}>
              <div className="absolute top-0 right-0 px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
                style={{ background: "var(--premium)", color: "#fff" }}>有料note</div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="premium-tag">{pickArticle.vol} · 編集部</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{pickArticle.lastUpdate}</span>
              </div>
              <h3 className="font-serif-jp font-bold text-lg leading-snug" style={{ color: "var(--ink)" }}>{pickArticle.title}</h3>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                  <span style={{ color: "var(--premium)" }} className="font-bold">{pickArticle.price}</span> · {pickArticle.buyers} 購入
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--premium)" }}>note で読む →</span>
              </div>
            </a>
          </div>
        </section>

        {/* 編集部の本棚 — Amazon associates row, editorial-styled */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
          <div className="border-t pt-10" style={{ borderColor: "var(--rule)" }}>
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>The Editor's Shelf · 編集部の本棚</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>受験者がいま読んでいる本</h2>
                <p className="text-[14px] mt-1.5 max-w-[58ch]" style={{ color: "var(--ink-muted)" }}>
                  当ノートの読者がこの30日間で最も多く購入した参考書。<span className="pr-tag ml-2">PR</span> Amazon アソシエイトを利用。
                </p>
              </div>
              <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All references →</a>
            </div>
            <div className="grid grid-cols-5 gap-6">
              {mockBooks.slice(0,5).map((b, i) => (
                <a key={b.id} href="#" className="block group">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 z-10 w-7 h-7 flex items-center justify-center font-mono text-[11px] tabular-nums"
                      style={{ background: "var(--ink)", color: "#fff" }}>{String(i+1).padStart(2,"0")}</div>
                    <BookCover book={b} size="md" />
                  </div>
                  <div className="mt-3 font-serif-jp font-bold text-[13px] leading-snug line-clamp-2" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <StarRow rating={b.rating} />
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{b.rating}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* "編集部だより" + paid note magazine list — pull quote style */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7 border-l-2 pl-8" style={{ borderColor: "var(--accent)" }}>
              <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>From the Editor · 編集部だより</div>
              <IconQuote className="w-8 h-8 mb-3" style={{ color: "var(--accent)" }} stroke={1.5} />
              <p className="font-serif-jp text-[22px] leading-[1.75] mb-5" style={{ color: "var(--ink)" }}>
                試験対策の本質は、過去問の暗記ではなく現場での <strong>判断の言語化</strong> にあります。
                有料 note は、無料記事では深く扱えない<u style={{ textDecorationColor: "var(--accent)", textDecorationThickness: 1, textUnderlineOffset: 4 }}>記述式の合格論文テンプレート</u>と添削事例を、テーマ別にまとめたものです。
              </p>
              <div className="flex items-center gap-3">
                <div className="avatar w-12 h-12 rounded-full">N</div>
                <div>
                  <div className="font-serif-jp font-bold text-[15px]" style={{ color: "var(--ink)" }}>編集部 N</div>
                  <div className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>1級土木施工管理技士 / 技術士（建設・総監）</div>
                </div>
              </div>
            </div>
            <aside className="col-span-5">
              <div className="spec-tag mb-4" style={{ color: "var(--ink-muted)" }}>Paid Notes · 有料note マガジン</div>
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
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">更新 {n.lastUpdate}</span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#" className="block text-center font-mono text-[11px] tracking-widest uppercase py-3 border"
                    style={{ borderColor: "var(--premium)", color: "var(--premium)" }}>
                    note でマガジン一覧を見る →
                  </a>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        {/* About + Editor + AdSense rectangle */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14 border-t" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: "var(--ink-muted)" }}>About</div>
              <h2 className="font-serif-jp text-3xl font-black mb-5" style={{ color: "var(--ink)" }}>このノートについて</h2>
              <p className="text-[15px] leading-[1.95] max-w-[55ch]" style={{ color: "var(--ink-body)" }}>
                doboku-note は、土木系資格試験の合格を目指す受験者と、実務で法令・仕様書を扱う技術者のためのノートです。日々の学習と実務から得た知見を、体系的な読み物として整理しています。
              </p>
              <p className="mt-4 text-[15px] leading-[1.95] max-w-[55ch]" style={{ color: "var(--ink-body)" }}>
                「試験で学んだ知識が現場でどう活きるか」「現場の課題が試験でどう問われるか」を往復できる構成を目指しています。
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                <span>About this site</span><span>→</span>
              </a>
            </div>
            <div className="col-span-5 space-y-6">
              <aside className="bg-white border p-8 shadow-soft rounded-card-section" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--ink-muted)" }}>Editor</div>
                <div className="flex items-start gap-4 mb-5">
                  <div className="avatar w-14 h-14 rounded-full text-lg">N</div>
                  <div>
                    <div className="font-serif-jp font-bold text-lg" style={{ color: "var(--ink)" }}>編集部 N</div>
                    <div className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>建設コンサル勤務 / 編集者</div>
                  </div>
                </div>
                <p className="text-sm leading-[1.85] mb-5" style={{ color: "var(--ink-body)" }}>
                  土木コンサルタント勤務。1級土木施工管理技士・技術士（建設部門・総合技術監理部門）。当ノートの執筆・編集を担当。
                </p>
                <div className="font-mono text-[10px] tracking-widest uppercase mb-2.5" style={{ color: "var(--ink-muted)" }}>Qualifications</div>
                <ul className="space-y-1.5 text-sm" style={{ color: "var(--ink-body)" }}>
                  {["1級土木施工管理技士","技術士（建設部門・道路）","技術士（総合技術監理部門）","コンクリート診断士"].map(q => (
                    <li key={q} className="flex gap-2 items-start">
                      <IconAward className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: "var(--accent)" }} stroke={1.5} />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </aside>
              {/* AdSense rectangle in sidebar position */}
              <div className="ad-slot" style={{ height: 250 }}>
                <div className="text-center">
                  <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                  <div className="text-[11px] mt-1">300 × 250 Rectangle</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.OptionA = OptionA;
