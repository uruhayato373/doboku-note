// About Option A — Editorial Profile
// 現行のエディトリアル構造を踏襲。著者の信頼性を最優先で構築し、その流れに沿って
// 「著者が使った参考書」「著者の有料note」を自然に紹介。AdSense は最小限。

function AboutOptionA() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { aboutAuthor, personalReadingList } = AboutMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const {
    IconAward, IconCheck, IconArrow, IconExternal, IconBook, IconHardHat, IconCap,
    IconFile, IconHash, IconChart, IconQuote, IconPin
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="border-b py-14" style={{ borderColor: "var(--rule-soft)", background: "var(--paper)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>About</span>
            </nav>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full mb-4"
              style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>About</span>
            <h1 className="font-serif-jp font-black text-[56px] tracking-tight leading-[1.15] mb-5" style={{ color: "var(--ink)" }}>doboku-note</h1>
            <p className="text-[17px] leading-[1.95] max-w-[60ch]" style={{ color: "var(--ink-body)" }}>
              <strong style={{ color: "var(--ink)" }}>1級土木施工管理技士</strong>・<strong style={{ color: "var(--ink)" }}>技術士（総合技術監理部門）</strong>の受験者に向けて、体系的な技術解説・過去問分析・勉強方法を提供する試験対策サイトです。
            </p>
            <p className="mt-5 italic text-[15px] max-w-[60ch]" style={{ color: "var(--accent)" }}>
              <strong className="not-italic font-bold" style={{ color: "var(--ink)" }}>橋を架ける。</strong>受験者と合格のあいだに、実務と試験のあいだに、現役と次世代のあいだに。
            </p>
          </div>
        </section>

        {/* Author profile */}
        <section className="py-12">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>運営者プロフィール</h2>
            <div className="bg-white border shadow-soft p-10" style={{ borderColor: "var(--rule-soft)" }}>
              <div className="flex gap-8 items-start">
                <div className="avatar w-28 h-28 rounded-full text-5xl shrink-0">N</div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif-jp font-bold text-2xl" style={{ color: "var(--ink)" }}>{aboutAuthor.name}</div>
                  <div className="text-sm mt-1" style={{ color: "var(--accent)" }}>{aboutAuthor.title}</div>
                  <p className="mt-4 leading-[1.95]" style={{ color: "var(--ink-body)" }}>{aboutAuthor.bio}</p>

                  <div className="mt-6">
                    <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Qualifications · 保有資格</div>
                    <ul className="space-y-1.5">
                      {aboutAuthor.qualifications.map(q => (
                        <li key={q.label} className="flex gap-2 items-baseline text-[14px]">
                          <IconAward className="w-4 h-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} stroke={1.5} />
                          <span className="flex-1" style={{ color: "var(--ink-body)" }}>{q.label}</span>
                          <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{q.year}年取得</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-serif-jp font-bold text-base mb-3" style={{ color: "var(--ink)" }}>編集方針</div>
                <ul className="text-[14px] leading-[1.85] space-y-2" style={{ color: "var(--ink-body)" }}>
                  {aboutAuthor.principles.map(p => <li key={p} className="flex gap-2">・{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Editor's bookshelf — author's own reading recommendations */}
        <section className="py-12 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Editor's bookshelf · 編集者の本棚</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>私が試験勉強で使った参考書</h2>
                <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                  当ノートのコンテンツの土台になった参考書5冊。<span className="pr-tag ml-1.5">PR · Amazon</span>
                </p>
              </div>
              <a href="#" className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>All references →</a>
            </div>
            <ul className="space-y-5">
              {personalReadingList.map((b, i) => (
                <li key={b.id} className="flex gap-6 bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="shrink-0">
                    <BookCover book={b} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>#{String(i+1).padStart(2,"0")} · {b.role.split(" / ")[0]}</div>
                    <h3 className="font-serif-jp font-bold text-xl leading-snug mb-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</h3>
                    <div className="font-mono text-[11px] mb-3" style={{ color: "var(--ink-muted)" }}>{b.author} · {b.year}</div>
                    <p className="text-[13px] leading-[1.85] mb-3" style={{ color: "var(--ink-body)" }}>
                      <IconQuote className="w-3 h-3 inline mr-1" style={{ color: "var(--accent)" }} />
                      {b.role}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <AmazonButton size="sm" />
                      <button className="font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--accent)" }}>当ノート内の関連記事 →</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Site concept (existing) */}
        <section className="py-12 bg-white">
          <div className="max-w-[820px] mx-auto px-6 lg:px-10 text-center">
            <h2 className="font-serif-jp text-3xl font-black mb-6" style={{ color: "var(--ink)" }}>サイトコンセプト</h2>
            <div className="bg-[var(--bg)] border p-8" style={{ borderColor: "var(--rule-soft)" }}>
              <p className="font-serif-jp font-bold text-2xl mb-5" style={{ color: "var(--accent)" }}>
                「ここだけで合格できる」体験を
              </p>
              <ul className="space-y-3 text-left max-w-[58ch] mx-auto">
                {[
                  ["体系的", "試験範囲を網羅した技術解説"],
                  ["実践的", "過去問の傾向分析と得点戦略"],
                  ["効率的", "忙しい実務者でも合格できる学習法"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-start gap-2">
                    <IconCheck className="w-5 h-5 mt-1 shrink-0" style={{ color: "var(--accent)" }} />
                    <p style={{ color: "var(--ink-body)" }}>
                      <strong style={{ color: "var(--ink)" }}>{k}</strong> → {v}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Author's note magazine row — paid notes */}
        <section className="py-12 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--premium)" }}>Paid notes by N · 著者の有料note</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>編集者が書いた、合格論文の決定版</h2>
                <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                  サイト内の無料記事を読んだ次の一歩として、論述・添削の体系化された教材を有料 note で公開しています。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              {mockPaidNotes.map(n => (
                <a key={n.vol} href="#" className="block bg-white border-2 p-6" style={{ borderColor: "var(--premium-line)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--premium)" }}>{n.vol}</div>
                  <h3 className="font-serif-jp font-black text-[18px] leading-tight mb-3" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{n.title}</h3>
                  <div className="flex items-baseline justify-between mb-3 pb-3 border-b" style={{ borderColor: "var(--rule-soft)" }}>
                    <span className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--premium)" }}>{n.price}</span>
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{n.buyers} 購入</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--premium)" }}>note で読む → </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Content categories (existing 2-col, simplified) */}
        <section className="py-12 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <h2 className="font-serif-jp text-3xl font-black text-center mb-2" style={{ color: "var(--ink)" }}>対応試験</h2>
            <p className="text-center mb-10" style={{ color: "var(--ink-muted)" }}>土木系の主要資格試験をカバー</p>
            <div className="grid grid-cols-2 gap-8">
              {[
                { Ic: IconHardHat, title: "1級土木施工管理技士", color: "var(--accent)", items: [
                  ["BookOpen", "試験ガイド・勉強法", "出題傾向、得点戦略、学習スケジュール"],
                  ["FileText", "過去問解説", "第1次・第2次検定の過去問を詳細解説"],
                  ["GraduationCap", "技術解説", "土工・コンクリート・基礎工・施工管理"],
                ]},
                { Ic: IconCap, title: "技術士（総合技術監理部門）", color: "#0891b2", items: [
                  ["Target", "5つの管理分野", "経済性管理・人的資源管理・情報管理・安全管理・社会環境管理"],
                  ["Search", "キーワード解説", "試験頻出キーワードを体系的に整理"],
                  ["CheckCircle", "過去問・模擬問題", "択一式・記述式の過去問を年度別に解説"],
                ]},
              ].map(s => (
                <div key={s.title}>
                  <h3 className="font-serif-jp font-bold text-xl text-center mb-5" style={{ color: s.color }}>{s.title}</h3>
                  <div className="space-y-4">
                    {s.items.map(([_, t, sub]) => (
                      <div key={t} className="bg-[var(--bg)] border p-4 flex items-center gap-4" style={{ borderColor: "var(--rule-soft)" }}>
                        <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: s.color }}>
                          <s.Ic className="w-6 h-6" style={{ color: "#fff" }} stroke={1.5} />
                        </div>
                        <div>
                          <div className="font-serif-jp font-bold mb-1" style={{ color: "var(--ink)" }}>{t}</div>
                          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Start learning */}
        <section className="py-12 border-t" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <h2 className="font-serif-jp text-3xl font-black mb-3" style={{ color: "var(--ink)" }}>学習を始める</h2>
            <p className="mb-6" style={{ color: "var(--ink-body)" }}>まずは各試験のカテゴリ目次から、必要な分野にアクセスしてください。</p>
            <div className="grid grid-cols-2 gap-4">
              <a href="#" className="block bg-white border p-5 font-serif-jp font-bold text-lg" style={{ borderColor: "var(--rule-soft)", color: "var(--ink)" }}>
                1級土木施工管理技士 →
              </a>
              <a href="#" className="block bg-white border p-5 font-serif-jp font-bold text-lg" style={{ borderColor: "var(--rule-soft)", color: "var(--ink)" }}>
                技術士（総合技術監理部門） →
              </a>
            </div>
          </div>
        </section>

        {/* Minimal AdSense — at the end only */}
        <section className="py-8">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="ad-slot" style={{ height: 140 }}>
              <div className="text-center">
                <div style={{ letterSpacing: "0.18em" }}>Google AdSense</div>
                <div className="text-[11px] mt-1">Responsive Banner</div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-10 border-t" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <h2 className="font-serif-jp text-3xl font-black mb-3" style={{ color: "var(--ink)" }}>お問い合わせ</h2>
            <p className="mb-6" style={{ color: "var(--ink-body)" }}>ご質問やご意見がございましたらお気軽にお問い合わせください。</p>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
                お問い合わせフォーム
              </a>
              <a href="#" className="inline-flex items-center gap-2 border px-5 py-2.5 font-medium" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)" }}>
                X でフォロー @{aboutAuthor.twitter.replace("@","")}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.AboutOptionA = AboutOptionA;
