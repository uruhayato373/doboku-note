// Docs Option D — Magazine Wrapper
// 記事を雑誌の1ページとして扱い、Issue 番号・ページ番号・余白注釈（marginalia）で装飾。
// 余白注釈に Amazon リンクを差し込み、末尾に「定期購読」モデルの note 有料マガジンを CTA 化。
// 最もブランド体験を重視した、エディトリアル × サブスク型。

function DocsOptionD() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { articleMeta, articleToc, ArticleBody, AuthorCard } = DocsShared;
  const { mockBooks, mockPaidNotes, mockArticles } = MockData;
  const {
    IconHash, IconClock, IconArrow, IconExternal, IconChevron, IconBook, IconQuote, IconPin, IconStar
  } = Icons;

  // Marginalia notes — footnotes that double as affiliate references
  const margins = [
    { id: 1, anchor: "intro", label: "→01", title: "示方配合と現場配合の違い", note: "土木学会示方書 [施工編] 第3章で、両者の関係と補正手順が体系的に整理されている。", b: mockBooks[2] },
    { id: 2, anchor: "wc-ratio", label: "→02", title: "強度比 F_m / F_c の解釈", note: "「1級土木 第1次検定 完全攻略」第4章。標準偏差 σ を含む配合強度の式を、例題で確認できる。", b: mockBooks[0] },
    { id: 3, anchor: "trial-mix", label: "→03", title: "試し練りの実施要領", note: "「土質力学 基礎から実務まで」コラム参照。骨材の含水率測定と配合補正の手順を、写真付きで解説。", b: mockBooks[5] },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <div className="w-full pb-16">
        {/* Issue masthead */}
        <div className="max-w-[1280px] mx-auto px-10 pt-8 pb-4">
          <div className="flex items-end justify-between border-b-2 pb-3" style={{ borderColor: "var(--rule)" }}>
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--ink-muted)" }}>From doboku-note Monthly</div>
              <div className="font-serif-jp font-black text-[24px] leading-none mt-1" style={{ color: "var(--ink)" }}>Issue 04 — May 2026</div>
            </div>
            <div className="flex items-center gap-5 font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
              <span>SECTION · Concrete</span>
              <span>P. 12 – 18</span>
              <span>編集部 N</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-10 flex gap-10 relative">
          <main className="flex-1 min-w-0 py-10">
            <article className="bg-white border-2 py-14 px-14 relative" style={{ borderColor: "var(--ink)" }}>
              {/* Page number top-right */}
              <div aria-hidden className="absolute top-4 right-6 font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>P. 12</div>
              <div aria-hidden className="absolute bottom-4 left-6 font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>— 12 —</div>

              <nav className="mb-5 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <span>Feature 02 · 配合設計</span>
              </nav>

              {/* Drop-cap headline */}
              <h1 className="font-serif-jp font-black tracking-tight leading-[1.08] text-[52px]" style={{ color: "var(--ink)" }}>
                {articleMeta.title}
              </h1>

              {/* Subtitle/byline */}
              <div className="mt-6 mb-8 pb-5 border-b flex items-center justify-between" style={{ borderColor: "var(--rule)" }}>
                <div className="flex items-center gap-3">
                  <div className="avatar w-10 h-10 rounded-full">N</div>
                  <div>
                    <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>編集部 N</div>
                    <div className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>1級土木 / 技術士（建設・総監）</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>
                  <span>2026.05.16</span>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-1"><IconClock className="w-3 h-3" />12分</span>
                </div>
              </div>

              {/* Body */}
              <ArticleBody />

              {/* Pull quote near the end */}
              <div className="my-12 py-8 border-y-2 text-center" style={{ borderColor: "var(--ink)" }}>
                <IconQuote className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--accent)" }} stroke={1.2} />
                <p className="font-serif-jp text-[26px] leading-[1.5] max-w-[28ch] mx-auto" style={{ color: "var(--ink)" }}>
                  単位水量を抑える努力こそ、コンクリート品質管理の本質である。
                </p>
                <div className="mt-4 font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>— 編集部 N</div>
              </div>

              {/* End-of-article footer meta */}
              <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="flex flex-wrap gap-3">
                  {articleMeta.tags.map(t => (
                    <a key={t} href="#" className="font-mono text-[11px] flex items-center gap-1 px-2 py-1 border"
                      style={{ borderColor: "var(--rule-soft)", color: "var(--ink-body)" }}>
                      <IconHash className="w-2.5 h-2.5" />{t}
                    </a>
                  ))}
                </div>
              </div>
            </article>

            {/* References — bottom of article (Amazon, marginalia full list) */}
            <section className="mt-8 bg-white border p-7" style={{ borderColor: "var(--rule)" }}>
              <div className="flex items-end justify-between mb-5 pb-3 border-b" style={{ borderColor: "var(--rule)" }}>
                <div>
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>References · 本号で参照した文献</div>
                  <h2 className="font-serif-jp text-xl font-black" style={{ color: "var(--ink)" }}>編集部が手元で開いている本</h2>
                </div>
                <span className="pr-tag" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR · Amazon</span>
              </div>
              <ol className="space-y-5">
                {margins.map(m => (
                  <li key={m.id} className="flex gap-5">
                    <div className="shrink-0">
                      <BookCover book={m.b} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>{m.label}</span>
                        <span className="font-serif-jp font-bold text-[14px]" style={{ color: "var(--ink)" }}>{m.title}</span>
                      </div>
                      <p className="text-[12px] leading-[1.85] mb-2" style={{ color: "var(--ink-body)" }}>{m.note}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>{m.b.author}</div>
                        <div className="flex items-center gap-1.5">
                          <StarRow rating={m.b.rating} />
                          <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{m.b.rating}</span>
                        </div>
                        <div className="font-serif-jp font-bold text-[13px] tabular-nums" style={{ color: "var(--ink)" }}>{m.b.price}</div>
                        <AmazonButton size="sm" />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Subscription CTA — paid note magazine subscription */}
            <section className="mt-8 relative overflow-hidden p-10" style={{ background: "var(--ink)", color: "#fff" }}>
              <div className="absolute top-0 right-0 px-3 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: "var(--premium)", color: "#fff" }}>Subscribe · 定期購読</div>
              <div className="grid grid-cols-12 gap-8 items-center">
                <div className="col-span-8">
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--premium-fill)" }}>doboku-note Monthly</div>
                  <h2 className="font-serif-jp text-[36px] font-black leading-[1.15] mb-3">
                    Issue 05 を含む、<br/>12号すべてを ¥980 / 月で。
                  </h2>
                  <p className="text-[14px] leading-[1.9] mb-5 max-w-[55ch]" style={{ color: "#cdd5dc" }}>
                    本誌は note のマガジン定期購読に対応しました。毎月の合格論文 1 本に加え、バックナンバー全12号も読み放題。
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href="#" className="inline-flex items-center gap-2 px-6 py-3 font-mono uppercase tracking-widest text-[12px] font-bold"
                      style={{ background: "var(--premium-fill)", color: "var(--ink)" }}>note で定期購読 <IconExternal className="w-3 h-3" /></a>
                    <span className="font-mono text-[10px]" style={{ color: "#9aa8b4" }}>初月無料 · いつでも解約可</span>
                  </div>
                </div>
                <div className="col-span-4 grid grid-cols-2 gap-3">
                  {mockPaidNotes.map(n => (
                    <div key={n.vol} className="bg-white p-3" style={{ color: "var(--ink)" }}>
                      <div className="font-mono text-[9px] tabular-nums" style={{ color: "var(--premium)" }}>{n.vol}</div>
                      <div className="font-serif-jp font-bold text-[10px] mt-1 leading-snug line-clamp-2" style={{ whiteSpace: "pre-line" }}>{n.title}</div>
                    </div>
                  ))}
                  <div className="border-2 p-3 text-center flex items-center justify-center font-mono text-[10px] tracking-widest uppercase" style={{ borderColor: "var(--premium-fill)", color: "var(--premium-fill)" }}>
                    + Issue 05<br/>近日公開
                  </div>
                </div>
              </div>
            </section>

            <AuthorCard />
          </main>

          {/* Sidebar — marginalia notes (footnotes that also link to Amazon) */}
          <aside className="w-[280px] shrink-0 py-10 hidden lg:block">
            <div className="sticky top-6 space-y-4">
              {/* TOC */}
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Contents</div>
                <ol className="space-y-2 text-[11px]">
                  {articleToc.map(h => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a href={`#${h.id}`} className="block leading-tight" style={{ color: h.id === "wc-ratio" ? "var(--ink)" : "var(--ink-body)", fontWeight: h.id === "wc-ratio" ? 700 : 400 }}>
                        <span className="font-mono text-[10px] tabular-nums mr-1.5" style={{ color: "var(--ink-muted)" }}>{h.num}</span>
                        {h.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Marginalia */}
              <div className="bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--accent)" }}>Marginalia · 余白の注釈</div>
                <ol className="space-y-4">
                  {margins.map(m => (
                    <li key={m.id} className="text-[11px] leading-[1.7]">
                      <a href={`#${m.anchor}`} className="font-mono text-[10px] tracking-widest uppercase mb-1 block" style={{ color: "var(--accent)" }}>{m.label} → §{articleToc.find(t => t.id === m.anchor)?.num || ""}</a>
                      <div className="font-serif-jp font-bold text-[12px] mb-1" style={{ color: "var(--ink)" }}>{m.title}</div>
                      <p style={{ color: "var(--ink-body)" }}>{m.note}</p>
                      <a href="#" className="font-mono text-[9px] uppercase tracking-widest underline mt-1.5 inline-block" style={{ color: "var(--amazon)" }}>
                        {m.b.author} 著 · Amazon ↗
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Cover thumb — back to current issue */}
              <a href="#" className="block bg-white border p-3 group" style={{ borderColor: "var(--rule)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>From Issue 04</div>
                <div className="w-full aspect-[3/4] flex items-center justify-center font-serif-jp font-black text-[88px] tabular-nums mb-2"
                  style={{ background: "var(--ink)", color: "#fff" }}>04</div>
                <div className="font-serif-jp font-bold text-[12px] leading-tight" style={{ color: "var(--ink)" }}>経験記述「品質管理」13テーマ</div>
                <div className="mt-2 font-mono text-[10px] tabular-nums" style={{ color: "var(--premium)" }}>¥1,480 · 1,240+ 購入</div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-widest group-hover:underline" style={{ color: "var(--premium)" }}>View cover → </div>
              </a>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

window.DocsOptionD = DocsOptionD;
