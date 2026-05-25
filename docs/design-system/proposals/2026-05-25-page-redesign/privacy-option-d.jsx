// Privacy Option D — Two-column Reading + Trust Sidebar
// 中央に編集記事スタイルの本文、右に「編集者から」「変更履歴」「翻訳版（英語）」など
// 信頼性ファクターを集約。広告・物販リンクは一切なし、代わりに contact / about へ静かに誘導。

function PrivacyOptionD() {
  const { Header, Footer } = Shared;
  const { policySections, thirdPartyServices } = PrivacyMock;
  const {
    IconShield, IconChart, IconCheck, IconUser, IconCookie, IconClock, IconLock,
    IconUserCheck, IconRefresh, IconExternal, IconQuote, IconAward
  } = Icons;
  const IconMail = (p) => <Icons.IconFile {...p} />;
  const iconMap = { IconShield, IconChart, IconCheck, IconUser, IconCookie, IconClock, IconLock, IconUserCheck, IconRefresh, IconMail };

  const changelog = [
    { date: "2026.05.01", v: "2.1.0", desc: "サブプロセッサ一覧に Microsoft Clarity を追加" },
    { date: "2026.04.05", v: "2.0.0", desc: "GDPR 準拠の権利マトリクス・データ目録を導入" },
    { date: "2026.01.12", v: "1.3.0", desc: "Cookie カテゴリを 3 から 4 に細分化" },
    { date: "2025.09.20", v: "1.2.0", desc: "問い合わせ窓口の SLA を明記" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="border-b py-12 bg-white" style={{ borderColor: "var(--rule-soft)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>Privacy</span>
            </nav>
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Legal</div>
            <h1 className="font-serif-jp font-black text-[var(--ink)] text-[44px] tracking-tight leading-[1.2] mb-3">プライバシーポリシー</h1>
            <p className="font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-muted)" }}>v2.1.0 · 最終更新 2026.05.01 · 適用開始 2026.04.05</p>
          </div>
        </section>

        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12 grid grid-cols-12 gap-10">
          {/* Main column */}
          <article className="col-span-8 bg-white border shadow-soft p-10" style={{ borderColor: "var(--rule-soft)" }}>
            <p className="text-[16px] leading-[1.95] mb-8 p-5 border-l-4" style={{ color: "var(--ink-body)", borderColor: "var(--accent)", background: "var(--accent-fill)" }}>
              本ポリシーは、doboku-note 編集部が、当サイトの読者と取り交わす約束です。データの利用方法を明確に開示し、読者が自分のデータを管理できる状態を保つことを、運営者の責務と考えています。
            </p>

            {policySections.map((s, i) => {
              const Ic = iconMap[s.icon] || IconShield;
              return (
                <section key={s.id} id={s.id} className={i > 0 ? "mt-12 pt-8 border-t" : ""} style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[10px] tabular-nums tracking-widest" style={{ color: "var(--accent)" }}>§ {s.num}</span>
                    <Ic className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  </div>
                  <h2 className="font-serif-jp font-black text-2xl leading-tight mb-3" style={{ color: "var(--ink)" }}>{s.title}</h2>
                  <p className="text-[15px] leading-[1.95] mb-3" style={{ color: "var(--ink-body)" }}>{s.body}</p>

                  {s.list && (
                    <ul className="space-y-2 mt-4">
                      {s.list.map(it => (
                        <li key={it} className="flex gap-2 text-[14px] leading-[1.85]"><IconCheck className="w-4 h-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} /><span style={{ color: "var(--ink-body)" }}>{it}</span></li>
                      ))}
                    </ul>
                  )}

                  {s.table && (
                    <table className="w-full text-[13px] mt-5 border" style={{ borderColor: "var(--rule-soft)" }}>
                      <thead>
                        <tr style={{ background: "var(--accent-fill)" }}>
                          {s.table.head.map(h => (
                            <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((row, k) => (
                          <tr key={k} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                            {row.map((cell, l) => (
                              <td key={l} className="px-3 py-2 align-top" style={{ color: l === 0 ? "var(--ink)" : "var(--ink-body)", fontWeight: l === 0 ? 700 : 400 }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {s.id === "cookies" && (
                    <div className="mt-5 p-4 border" style={{ borderColor: "var(--rule-soft)", background: "#fffbeb" }}>
                      <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "#b45309" }}>広告 Cookie について</div>
                      <p className="text-[13px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
                        当サイトは <strong>Google AdSense</strong> を利用しています。広告 Cookie を無効化したい場合は、Google の <a href="#" className="underline" style={{ color: "var(--accent)" }}>広告設定 ↗</a> または <a href="#" className="underline" style={{ color: "var(--accent)" }}>aboutads.info ↗</a> から個別に変更できます。
                      </p>
                    </div>
                  )}

                  {s.id === "contact" && (
                    <div className="mt-5 p-5 border" style={{ borderColor: "var(--rule)", background: "var(--bg)" }}>
                      <div className="font-serif-jp font-bold text-base mb-1" style={{ color: "var(--ink)" }}>doboku-note 運営事務局</div>
                      <div className="font-mono text-[13px] tabular-nums mb-2" style={{ color: "var(--accent)" }}>privacy@doboku-note.com</div>
                      <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>件名に「プライバシーポリシーに関するお問い合わせ」と記載してください。返信は通常 7 営業日以内に行います。</p>
                    </div>
                  )}
                </section>
              );
            })}
          </article>

          {/* Trust sidebar — NO ads, NO affiliates. Trust-building only. */}
          <aside className="col-span-4">
            <div className="sticky top-6 space-y-4">
              {/* Editor's note — personal voice */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>From the editor</div>
                <IconQuote className="w-6 h-6 mb-2" style={{ color: "var(--accent)" }} stroke={1.2} />
                <p className="text-[13px] leading-[1.95] italic mb-4" style={{ color: "var(--ink-body)" }}>
                  プライバシーポリシーは、ユーザーに見せるための飾りではありません。私たちが取り扱うデータの範囲と、それに対する責任を、運営者自身が明示するための文書です。
                </p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="avatar w-10 h-10 rounded-full">N</div>
                  <div>
                    <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>編集部 N</div>
                    <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>運営者・編集責任者</div>
                  </div>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--accent)" }}>About the editor →</a>
              </div>

              {/* Quick TOC */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Contents</div>
                <ol className="space-y-2">
                  {policySections.map(s => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="flex items-baseline gap-2 hover:text-[var(--accent)]" style={{ color: "var(--ink-body)" }}>
                        <span className="font-mono text-[10px] tabular-nums shrink-0" style={{ color: "var(--ink-muted)" }}>§{s.num}</span>
                        <span className="font-serif-jp text-[12px] leading-snug">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Changelog — earns trust through visible iteration */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Changelog · 変更履歴</div>
                <ol className="space-y-3">
                  {changelog.map(c => (
                    <li key={c.v} className="text-[12px] leading-[1.7]">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono tabular-nums shrink-0" style={{ color: "var(--accent)" }}>{c.v}</span>
                        <span className="font-mono tabular-nums" style={{ color: "var(--ink-muted)" }}>{c.date}</span>
                      </div>
                      <div className="mt-0.5" style={{ color: "var(--ink-body)" }}>{c.desc}</div>
                    </li>
                  ))}
                </ol>
                <a href="#" className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest underline" style={{ color: "var(--accent)" }}>Full changelog ↗</a>
              </div>

              {/* Available languages / formats */}
              <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Other formats</div>
                <ul className="space-y-2 text-[13px]">
                  {[
                    ["English version (v2.1.0)", "EN"],
                    ["PDF download", "PDF"],
                    ["GitHub で履歴を見る", "Repo"],
                  ].map(([t, b]) => (
                    <li key={t} className="flex items-center justify-between">
                      <a href="#" className="hover:underline" style={{ color: "var(--ink)" }}>{t}</a>
                      <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: "var(--accent-fill)", color: "var(--accent)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Related pages — soft cross-link */}
              <div className="bg-[var(--bg)] border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Related</div>
                <ul className="space-y-2 text-[13px]">
                  <li><a href="#" className="hover:underline" style={{ color: "var(--accent)" }}>利用規約 →</a></li>
                  <li><a href="#" className="hover:underline" style={{ color: "var(--accent)" }}>特定商取引法に基づく表記 →</a></li>
                  <li><a href="#" className="hover:underline" style={{ color: "var(--accent)" }}>編集ガイドライン →</a></li>
                  <li><a href="#" className="hover:underline" style={{ color: "var(--accent)" }}>お問い合わせ →</a></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

window.PrivacyOptionD = PrivacyOptionD;
