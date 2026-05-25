// About Option B — Author Hero / Personal Brand
// 著者を「商品」として位置づけ、Stratechery 型の個人ブランドサイトに寄せる。
// 大型著者ヒーロー + 資格タイムライン + 著者の蔵書 + 著者のnote定期購読 + ニュースレター。

function AboutOptionB() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { aboutAuthor, personalReadingList } = AboutMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const {
    IconAward, IconCheck, IconArrow, IconExternal, IconBook, IconQuote, IconPin,
    IconStar, IconChart, IconTrend, IconBolt, IconLayers, IconClock
  } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Author hero — magazine-portrait */}
        <section className="relative" style={{ background: "var(--ink)", color: "#fff" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-12 gap-10 items-end">
            <div className="col-span-7">
              <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-4" style={{ color: "var(--premium-fill)" }}>doboku-note · Editor</div>
              <h1 className="font-serif-jp font-black text-[88px] leading-[0.95] tracking-tight mb-6">
                編集部<br/><span style={{ color: "var(--premium-fill)" }}>N。</span>
              </h1>
              <p className="text-[16px] leading-[1.95] max-w-[55ch] mb-6" style={{ color: "#cdd5dc" }}>
                土木コンサルタント勤務。河川・道路・橋梁の調査計画から設計・施工監理まで、構造物のライフサイクル全般に携わる。<br/>
                試験勉強と実務の往復で得た知見を、当ノートで体系的に整理・公開しています。
              </p>
              <div className="grid grid-cols-4 gap-4 mb-7 max-w-[600px]">
                {[
                  { k: "Articles", v: aboutAuthor.siteStats.articles },
                  { k: "Keywords", v: aboutAuthor.siteStats.keywords },
                  { k: "Monthly", v: aboutAuthor.siteStats.visitors },
                  { k: "Paid readers", v: aboutAuthor.siteStats.paidReaders },
                ].map(s => (
                  <div key={s.k} className="border-l-2 pl-3" style={{ borderColor: "var(--premium-fill)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#9aa8b4" }}>{s.k}</div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums mt-1">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <a href="#" className="inline-flex items-center gap-2 px-6 py-3 font-mono uppercase tracking-widest text-[12px] font-bold"
                  style={{ background: "var(--premium-fill)", color: "var(--ink)" }}>
                  note を定期購読 <IconExternal className="w-3 h-3" />
                </a>
                <a href="#" className="inline-flex items-center gap-2 px-5 py-3 font-mono uppercase tracking-widest text-[11px] border"
                  style={{ borderColor: "var(--premium-fill)", color: "var(--premium-fill)" }}>
                  X でフォロー
                </a>
              </div>
            </div>
            <aside className="col-span-5">
              {/* Big avatar / portrait */}
              <div className="avatar w-full aspect-square text-[180px] rounded-none" style={{ background: "linear-gradient(135deg, var(--premium-fill), #d9c089)", color: "var(--ink)" }}>N</div>
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] tabular-nums" style={{ color: "#9aa8b4" }}>
                <span>運営期間 {aboutAuthor.siteStats.sinceMonths}ヶ月</span>
                <span className="text-right">since 2024</span>
              </div>
            </aside>
          </div>
        </section>

        {/* Qualification timeline */}
        <section className="py-14 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Credentials timeline · 受験経歴</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>合格までの 8 年</h2>
              </div>
            </div>
            {/* Horizontal timeline */}
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-px" style={{ background: "var(--rule)" }} />
              <div className="grid grid-cols-7 gap-3 relative">
                {aboutAuthor.qualifications.map((q, i) => (
                  <div key={q.label} className="text-center">
                    <div className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{q.year}</div>
                    <div className="mx-auto my-2 w-3 h-3 rounded-full relative z-10" style={{ background: "var(--accent)", border: "3px solid #fff", boxShadow: "0 0 0 1px var(--accent)" }} />
                    <div className="font-serif-jp font-bold text-[12px] leading-snug mt-2" style={{ color: "var(--ink)" }}>{q.label}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest mt-1" style={{ color: "var(--ink-muted)" }}>{q.type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test results table */}
            <div className="mt-12 grid grid-cols-2 gap-10">
              <div>
                <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Test results · 受験結果</div>
                <table className="w-full text-[13px] border" style={{ borderColor: "var(--rule-soft)" }}>
                  <thead>
                    <tr style={{ background: "var(--accent-fill)" }}>
                      <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>試験</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>合格年</th>
                      <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>結果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aboutAuthor.examHistory.map(e => (
                      <tr key={e.exam} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                        <td className="px-3 py-2 font-bold" style={{ color: "var(--ink)" }}>{e.exam}</td>
                        <td className="px-3 py-2 tabular-nums" style={{ color: "var(--ink-body)" }}>{e.year}</td>
                        <td className="px-3 py-2" style={{ color: "var(--ink-body)" }}>{e.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Editorial policy · 編集方針</div>
                <ul className="text-[13px] leading-[1.85] space-y-2" style={{ color: "var(--ink-body)" }}>
                  {aboutAuthor.principles.map(p => (
                    <li key={p} className="flex gap-2"><IconCheck className="w-4 h-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} /><span>{p}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Author's note magazine — subscription model */}
        <section className="py-14">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-0 border-2" style={{ borderColor: "var(--premium)" }}>
              <div className="col-span-5 p-10" style={{ background: "var(--premium-fill)" }}>
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--premium)" }}>Author's premium</div>
                <h2 className="font-serif-jp font-black text-[40px] leading-[1.1] mb-4" style={{ color: "var(--ink)" }}>
                  N が毎月、<br/>合格論文を 1 本。
                </h2>
                <p className="text-[14px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
                  当ノートの著者が個人で運営する有料 note マガジン。経験記述・添削事例・キーワード整理を、毎月1冊のペースで配信しています。
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-serif-jp font-black text-[44px] tabular-nums" style={{ color: "var(--premium)" }}>¥980</span>
                  <span className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>/月 · 初月無料</span>
                </div>
                <p className="text-[11px] mb-6" style={{ color: "var(--ink-muted)" }}>定期購読中はバックナンバー全12号を読み放題</p>
                <a href="#" className="inline-flex items-center gap-2 px-6 py-3 font-mono uppercase tracking-widest text-[12px] font-bold"
                  style={{ background: "var(--premium)", color: "#fff" }}>
                  note で定期購読 <IconExternal className="w-3 h-3" />
                </a>
              </div>
              <div className="col-span-7 p-10 bg-white">
                <div className="font-mono text-[10px] uppercase tracking-widest mb-5" style={{ color: "var(--ink-muted)" }}>Back issues · 最近の発刊</div>
                <ul className="divide-y" style={{ borderColor: "var(--rule-soft)" }}>
                  {mockPaidNotes.map((n, i) => (
                    <li key={n.vol} className="py-4 first:pt-0 last:pb-0" style={{ borderColor: "var(--rule-soft)" }}>
                      <div className="flex items-start gap-4">
                        <div className="font-serif-jp font-black text-3xl tabular-nums shrink-0" style={{ color: "var(--premium)" }}>{n.vol.replace("Vol. ","")}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif-jp font-bold text-[16px] leading-tight" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{n.title}</h3>
                          <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                            <span className="tabular-nums">{n.lastUpdate}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">{n.buyers} 購入</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums" style={{ color: "var(--premium)" }}>{n.price}</span>
                          </div>
                        </div>
                        <IconArrow className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--ink-muted)" }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter signup — soft monetization (mailing list) */}
        <section className="py-12 border-t border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[820px] mx-auto px-6 lg:px-10 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Newsletter</div>
            <h2 className="font-serif-jp text-3xl font-black mb-3" style={{ color: "var(--ink)" }}>毎週日曜、 N から1通。</h2>
            <p className="text-[15px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>
              その週に公開した記事のダイジェスト、編集後記、試験スケジュールのリマインドを、毎週日曜の朝にメールでお届けします。完全無料・いつでも解除可能。
            </p>
            <form className="flex items-stretch gap-2 max-w-[480px] mx-auto">
              <input type="email" placeholder="your@email.com"
                className="flex-1 px-4 py-3 border-2 font-mono text-[14px] tabular-nums"
                style={{ borderColor: "var(--ink)" }} />
              <button className="px-5 py-3 font-mono uppercase tracking-widest text-[11px] font-bold"
                style={{ background: "var(--ink)", color: "#fff" }}>登録</button>
            </form>
            <div className="mt-3 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>現在 4,820 名が購読中</div>
          </div>
        </section>

        {/* N's bookshelf — personal recommendation row */}
        <section className="py-14">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>N's bookshelf · 私が読んだ本</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>受験勉強で参考にした 5 冊</h2>
                <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                  当ノートのコンテンツの土台になった、N が実際に手元で使った参考書。<span className="pr-tag ml-1.5">PR · Amazon</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-5">
              {personalReadingList.map((b, i) => (
                <a key={b.id} href="#" className="block group">
                  <div className="relative mb-3">
                    <div className="absolute -top-2 -left-2 z-10 w-7 h-7 flex items-center justify-center font-mono text-[11px] tabular-nums"
                      style={{ background: "var(--ink)", color: "#fff" }}>{String(i+1).padStart(2,"0")}</div>
                    <BookCover book={b} size="lg" />
                  </div>
                  <div className="font-serif-jp font-bold text-[13px] leading-snug mb-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
                  <div className="font-mono text-[10px] mb-2" style={{ color: "var(--ink-muted)" }}>{b.author} · {b.year}</div>
                  <p className="text-[11px] italic leading-[1.7]" style={{ color: "var(--ink-body)" }}>"{b.role}"</p>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest underline" style={{ color: "var(--amazon)" }}>Amazon ↗</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.AboutOptionB = AboutOptionB;
