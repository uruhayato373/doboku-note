// About Option C — Manifesto + Resource Vault
// 「なぜこのサイトは存在するのか」を強い editorial manifesto で示し、
// 続いて「ここにあるもの」を3つの柱（無料 / 有料 / 推薦書）として並列展開。
// 各柱が独立した収益エンジンになるよう設計。

function AboutOptionC() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { aboutAuthor, personalReadingList } = AboutMock;
  const { mockBooks, mockPaidNotes, mockArticles } = MockData;
  const {
    IconAward, IconCheck, IconArrow, IconExternal, IconBook, IconQuote,
    IconFile, IconHash, IconLayers, IconPin, IconStar, IconChart
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Manifesto hero — bold editorial */}
        <section className="py-20 border-b-2" style={{ borderColor: "var(--ink)", background: "var(--paper)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>About</span>
            </nav>
            <div className="grid grid-cols-12 gap-10 items-end">
              <div className="col-span-9">
                <div className="font-mono text-[12px] tracking-[0.3em] uppercase mb-4" style={{ color: "var(--accent)" }}>Manifesto · 当ノートが目指すこと</div>
                <h1 className="font-serif-jp font-black text-[88px] leading-[0.95] tracking-tight" style={{ color: "var(--ink)" }}>
                  土木の現場と<br/>
                  試験を、<br/>
                  <span style={{ background: "linear-gradient(transparent 70%, var(--accent-fill) 70%)" }}>ひとつのノートに。</span>
                </h1>
              </div>
              <div className="col-span-3">
                <p className="text-[14px] leading-[1.95] pb-3 border-b-2" style={{ color: "var(--ink-body)", borderColor: "var(--ink)" }}>
                  受験者と合格のあいだに、実務と試験のあいだに、現役と次世代のあいだに、<strong style={{ color: "var(--ink)" }}>橋を架ける。</strong>
                </p>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>— 編集部 N</div>
              </div>
            </div>
          </div>
        </section>

        {/* Long-form manifesto */}
        <section className="py-16 bg-white">
          <div className="max-w-[860px] mx-auto px-6 lg:px-10">
            <div className="prose-body">
              <p className="font-serif-jp text-[20px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
                <span className="font-serif-jp font-black text-[48px] float-left mr-3 leading-[0.9] mt-1" style={{ color: "var(--accent)" }}>土</span>
                木の世界には、現場でしか分からないことがあります。一方で、試験の世界には、現場では問われない理屈があります。両者は別の言語で語られているように見えて、実は同じ土木という対象を、違う角度から見ているだけです。
              </p>
              <p className="text-[16px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
                当ノートは、<strong style={{ color: "var(--ink)" }}>その2つの言語を一つの読み物として翻訳する</strong> ことを目指しています。1級土木施工管理技士の出題範囲を、現場での適用例とともに整理する。技術士・総監のキーワード集を、実務での意思決定の枠組みとして読み直す。それが、本ノートの編集方針です。
              </p>
              <p className="text-[16px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
                試験勉強は孤独な作業です。それでも、合格者のあとを通れば、迷う時間は少なくて済む。当ノートは、私自身が 8 年間で 7 つの資格を通った道筋を、できるだけ整備された形で残したものです。<strong style={{ color: "var(--ink)" }}>次の受験者が、迷わず歩けるように。</strong>
              </p>
              <p className="text-[16px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>
                以下、当ノートで提供している 3 つの柱を紹介します。
              </p>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section className="py-12 border-t-2" style={{ borderColor: "var(--ink)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3 text-center" style={{ color: "var(--accent)" }}>Three pillars · 提供する3つの柱</div>
            <h2 className="font-serif-jp text-4xl font-black mb-10 text-center" style={{ color: "var(--ink)" }}>ここで読めるもの</h2>

            <div className="grid grid-cols-3 gap-0 border-2" style={{ borderColor: "var(--ink)" }}>
              {/* Pillar 1 — Free articles */}
              <div className="p-8 bg-white border-r-2" style={{ borderColor: "var(--ink)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--accent)" }}>01</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Free</div>
                </div>
                <IconFile className="w-10 h-10 mb-4" style={{ color: "var(--accent)" }} stroke={1.2} />
                <h3 className="font-serif-jp font-black text-2xl leading-tight mb-3" style={{ color: "var(--ink)" }}>体系的な無料記事</h3>
                <p className="text-[13px] leading-[1.9] mb-6" style={{ color: "var(--ink-body)" }}>
                  試験範囲を網羅した技術解説。1級土木施工と総監を合わせて、現在 <strong style={{ color: "var(--ink)" }}>287 本 / 412 キーワード</strong>。週 2〜3 本ペースで更新。
                </p>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t mb-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--ink)" }}>287</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Articles</div>
                  </div>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--ink)" }}>412</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Keywords</div>
                  </div>
                </div>
                <a href="#" className="block w-full py-3 text-center font-mono uppercase tracking-widest text-[11px] font-bold border-2"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>無料で読み始める →</a>
              </div>

              {/* Pillar 2 — Paid notes */}
              <div className="p-8 bg-white border-r-2 relative" style={{ borderColor: "var(--ink)", background: "linear-gradient(180deg, var(--premium-fill) 0%, #fff 30%)" }}>
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "var(--premium)" }} />
                <div className="flex items-center justify-between mb-4">
                  <div className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--premium)" }}>02</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--premium)" }}>Premium</div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center font-serif-jp font-black text-[28px] tabular-nums mb-4"
                  style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                <h3 className="font-serif-jp font-black text-2xl leading-tight mb-3" style={{ color: "var(--ink)" }}>有料 note マガジン</h3>
                <p className="text-[13px] leading-[1.9] mb-6" style={{ color: "var(--ink-body)" }}>
                  無料記事では深く扱えない<strong style={{ color: "var(--ink)" }}>記述式の合格論文テンプレート</strong>と添削事例。買い切り型と定期購読型の 2 形態で展開中。
                </p>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t mb-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--premium)" }}>12</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Issues</div>
                  </div>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--premium)" }}>3,200+</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Readers</div>
                  </div>
                </div>
                <a href="#" className="block w-full py-3 text-center font-mono uppercase tracking-widest text-[11px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>マガジン一覧へ →</a>
              </div>

              {/* Pillar 3 — Recommended books */}
              <div className="p-8 bg-white relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--amazon)" }}>03</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--amazon)" }}>References <span className="pr-tag ml-1.5" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR</span></div>
                </div>
                <IconBook className="w-10 h-10 mb-4" style={{ color: "var(--amazon)" }} stroke={1.2} />
                <h3 className="font-serif-jp font-black text-2xl leading-tight mb-3" style={{ color: "var(--ink)" }}>編集者の本棚</h3>
                <p className="text-[13px] leading-[1.9] mb-6" style={{ color: "var(--ink-body)" }}>
                  N が実際に試験勉強で使った参考書 5 冊と、現在も実務で参照している示方書類。Amazon アソシエイトで紹介しています。
                </p>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t mb-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--amazon)" }}>{personalReadingList.length}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Books</div>
                  </div>
                  <div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums" style={{ color: "var(--amazon)" }}>★4.7</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Avg rating</div>
                  </div>
                </div>
                <a href="#" className="block w-full py-3 text-center font-mono uppercase tracking-widest text-[11px] font-bold border-2"
                  style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>本棚を見る →</a>
              </div>
            </div>
          </div>
        </section>

        {/* Pillar 3 expanded — bookshelf */}
        <section className="py-14 bg-white border-t" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--amazon)" }}>Pillar 03 · 編集者の本棚</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>N が読んだ参考書</h2>
              </div>
              <span className="pr-tag" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR · Amazon</span>
            </div>
            <div className="grid grid-cols-5 gap-5">
              {personalReadingList.map((b, i) => (
                <a key={b.id} href="#" className="block group">
                  <BookCover book={b} size="lg" />
                  <div className="mt-3 font-serif-jp font-bold text-[13px] leading-snug" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>{b.author}</div>
                  <p className="mt-2 text-[11px] italic leading-[1.7]" style={{ color: "var(--ink-body)" }}>"{b.role}"</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* About the editor — compact, after the pillars */}
        <section className="py-14 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-4">
                <div className="avatar w-full aspect-square text-[120px] rounded-none mb-4">N</div>
                <div className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>{aboutAuthor.name}</div>
                <div className="font-mono text-[11px] mt-1" style={{ color: "var(--ink-muted)" }}>{aboutAuthor.title}</div>
              </div>
              <div className="col-span-8">
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>About the editor</div>
                <p className="text-[15px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>{aboutAuthor.bio}</p>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Qualifications</div>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {aboutAuthor.qualifications.map(q => (
                    <li key={q.label} className="flex gap-2 items-baseline text-[13px]">
                      <IconAward className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: "var(--accent)" }} stroke={1.5} />
                      <span className="flex-1" style={{ color: "var(--ink-body)" }}>{q.label}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{q.year}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.AboutOptionC = AboutOptionC;
