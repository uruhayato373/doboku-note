// Privacy Option B — Transparency Dashboard
// プライバシーポリシーを「読ませる」から「操作させる」へ転換。
// ユーザーが自分でCookie設定を切り替え、データの流れを可視化したダイアグラムで確認。
// "Plain English summary" を冒頭に置き、詳細は折りたたみで提供。最も信頼を稼ぐ方向性。

function PrivacyOptionB() {
  const { Header, Footer } = Shared;
  const { policySections, thirdPartyServices, cookieCategories } = PrivacyMock;
  const { IconShield, IconCheck, IconExternal, IconChart, IconUser, IconLock, IconBolt } = Icons;

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <section className="border-b py-14 bg-white" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>Privacy</span>
            </nav>
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Transparency · 透明性ダッシュボード</div>
            <h1 className="font-serif-jp font-black text-[var(--ink)] text-[48px] tracking-tight leading-[1.15] mb-4">
              あなたのデータが、<br/>どこへ流れているか。
            </h1>
            <p className="text-[16px] leading-[1.95] max-w-[60ch]" style={{ color: "var(--ink-body)" }}>
              プライバシーポリシーは "読ませる" ものではなく "確認できる" ものであるべきです。本ページでは、当サイトが収集するデータの種類・行き先・保持期間を、ダッシュボードとしてお見せします。
            </p>
          </div>
        </section>

        {/* Plain English summary */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>tl;dr · 要約</div>
                <h2 className="font-serif-jp text-2xl font-black" style={{ color: "var(--ink)" }}>3 行で言うと</h2>
              </div>
              <div className="col-span-9 grid grid-cols-3 gap-4">
                {[
                  { Ic: IconShield, t: "売りません", d: "個人情報を第三者に販売することはありません。法令上必要な場合のみ開示します。" },
                  { Ic: IconChart, t: "見ます", d: "Google Analytics・AdSense Cookie でアクセス傾向と広告を最適化しています。" },
                  { Ic: IconUser, t: "従います", d: "開示・訂正・削除のご請求は、いつでも 30 日以内に対応します。" },
                ].map(t => (
                  <div key={t.t} className="border-2 p-5" style={{ borderColor: "var(--ink)" }}>
                    <t.Ic className="w-7 h-7 mb-3" style={{ color: "var(--accent)" }} stroke={1.5} />
                    <h3 className="font-serif-jp font-black text-xl mb-2" style={{ color: "var(--ink)" }}>{t.t}</h3>
                    <p className="text-[13px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>{t.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Cookie preferences — interactive UI */}
        <section className="py-12">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Cookie controls · 設定</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>Cookie 設定をいま変更する</h2>
                <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-muted)" }}>下記スイッチで各カテゴリの Cookie を個別にオン/オフできます。変更はブラウザに保存されます。</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 border font-mono text-[11px] uppercase tracking-widest" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}>全て拒否</button>
                <button className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest" style={{ background: "var(--accent)", color: "#fff" }}>全て許可</button>
              </div>
            </div>
            <div className="bg-white border" style={{ borderColor: "var(--rule)" }}>
              {cookieCategories.map((c, i) => (
                <div key={c.key} className={`p-5 flex items-center gap-5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="w-1 self-stretch" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif-jp font-black text-lg" style={{ color: "var(--ink)" }}>{c.label} Cookie</h3>
                      {c.required && <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: "var(--ink)", color: "#fff" }}>Required</span>}
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{c.count} items</span>
                    </div>
                    <p className="text-[13px] leading-[1.8]" style={{ color: "var(--ink-body)" }}>{c.desc}</p>
                  </div>
                  <div className="shrink-0">
                    {c.required ? (
                      <div className="w-12 h-7 rounded-full relative" style={{ background: "var(--ink)" }}>
                        <div className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-7 rounded-full relative" style={{ background: c.key === "ads" ? "var(--rule)" : c.color }}>
                        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white ${c.key === "ads" ? "left-0.5" : "right-0.5"}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
              ※ 必須 Cookie はサイト機能のために常時有効です。広告 Cookie をオフにすると、サイト内の広告はパーソナライズされない代わりに、より一般的な広告が表示されます。
            </div>
          </div>
        </section>

        {/* Data flow diagram */}
        <section className="py-12 bg-white border-y" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Data flow · データの流れ</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>あなたのデータが通る経路</h2>

            <div className="border-2 p-8" style={{ borderColor: "var(--ink)" }}>
              <div className="grid grid-cols-5 gap-4 items-center">
                {/* User */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center border-2" style={{ borderColor: "var(--ink)", background: "var(--accent-fill)" }}>
                    <IconUser className="w-9 h-9" style={{ color: "var(--accent)" }} stroke={1.5} />
                  </div>
                  <div className="font-serif-jp font-bold text-[14px]" style={{ color: "var(--ink)" }}>あなた</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--ink-muted)" }}>User</div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-px w-full" style={{ background: "var(--ink)" }} />
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>HTTPS / TLS 1.3</div>
                </div>
                {/* Origin */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--ink)", color: "#fff" }}>
                    <span className="font-serif-jp font-black text-base">d-n</span>
                  </div>
                  <div className="font-serif-jp font-bold text-[14px]" style={{ color: "var(--ink)" }}>doboku-note</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: "var(--ink-muted)" }}>Origin server</div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-px w-full border-t border-dashed" style={{ borderColor: "var(--ink)" }} />
                  <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Selected services</div>
                </div>
                {/* Services */}
                <div className="space-y-2">
                  {thirdPartyServices.slice(0,4).map(s => (
                    <div key={s.name} className="border px-2 py-1.5 bg-white" style={{ borderColor: "var(--rule)" }}>
                      <div className="font-serif-jp font-bold text-[11px] leading-tight" style={{ color: "var(--ink)" }}>{s.name}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{s.category}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div className="mt-8 pt-6 border-t grid grid-cols-4 gap-4 text-[12px]" style={{ borderColor: "var(--rule-soft)" }}>
                {[
                  { Ic: IconLock, t: "暗号化", d: "全通信は TLS 1.3 で暗号化されます" },
                  { Ic: IconBolt, t: "最小化", d: "目的達成に必要なデータのみ収集" },
                  { Ic: IconChart, t: "集計", d: "個人ではなく集計値として分析" },
                  { Ic: IconCheck, t: "削除", d: "保持期間経過後は自動削除" },
                ].map(t => (
                  <div key={t.t} className="flex gap-2">
                    <t.Ic className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                    <div>
                      <div className="font-serif-jp font-bold mb-0.5" style={{ color: "var(--ink)" }}>{t.t}</div>
                      <div style={{ color: "var(--ink-body)" }}>{t.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Third-party services full inventory */}
        <section className="py-12">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Subprocessors · 利用する外部サービス一覧</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>当サイトが連携しているサービス</h2>
            <div className="bg-white border" style={{ borderColor: "var(--rule)" }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: "var(--accent-fill)" }}>
                    {["サービス", "カテゴリ", "目的", "送信されるデータ", "保持期間", "オプトアウト"].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {thirdPartyServices.map(svc => (
                    <tr key={svc.name} className="border-t hover:bg-[var(--accent-fill)]" style={{ borderColor: "var(--rule-soft)" }}>
                      <td className="px-5 py-3 font-serif-jp font-bold align-top" style={{ color: "var(--ink)" }}>{svc.name}</td>
                      <td className="px-5 py-3 align-top">
                        <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5" style={{ background: "var(--bg)", color: "var(--accent)" }}>{svc.category}</span>
                      </td>
                      <td className="px-5 py-3 align-top" style={{ color: "var(--ink-body)" }}>{svc.purpose}</td>
                      <td className="px-5 py-3 align-top font-mono text-[12px]" style={{ color: "var(--ink-body)" }}>{svc.data}</td>
                      <td className="px-5 py-3 align-top font-mono text-[12px] tabular-nums" style={{ color: "var(--ink-body)" }}>{svc.retention}</td>
                      <td className="px-5 py-3 align-top">
                        {svc.optOut.startsWith("http") ? (
                          <a href={svc.optOut} className="font-mono text-[11px] underline inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                            設定 <IconExternal className="w-3 h-3" />
                          </a>
                        ) : <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>{svc.optOut}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>※ 一覧は変更されることがあります。重要な変更は本ページに加え、ニュースレター購読者へメールで通知します。</div>
          </div>
        </section>

        {/* Your rights — action-oriented */}
        <section className="py-12 bg-white border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Your rights · あなたの権利</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>いま、できること</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { t: "データの開示請求", d: "当サイトが保有するあなたのデータの一覧をエクスポートできます。", btn: "リクエストする" },
                { t: "データの削除請求", d: "保有するあなたのデータをすべて削除します。30 日以内に完了します。", btn: "削除をリクエスト" },
                { t: "Cookie のリセット", d: "ブラウザに保存された当サイトの Cookie をすべて削除します。", btn: "今すぐリセット" },
                { t: "ニュースレター解除", d: "メール配信を停止します。次回配信から反映されます。", btn: "配信を停止" },
              ].map(c => (
                <div key={c.t} className="border p-5 bg-white" style={{ borderColor: "var(--rule)" }}>
                  <h3 className="font-serif-jp font-black text-base leading-tight mb-2" style={{ color: "var(--ink)" }}>{c.t}</h3>
                  <p className="text-[12px] leading-[1.85] mb-4" style={{ color: "var(--ink-body)" }}>{c.d}</p>
                  <button className="w-full py-2 font-mono uppercase tracking-widest text-[10px] font-bold border" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>{c.btn} →</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full policy collapsed */}
        <section className="py-12">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-2" style={{ color: "var(--ink-muted)" }}>Full policy · 全文</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>プライバシーポリシー全文</h2>
            <div className="bg-white border" style={{ borderColor: "var(--rule-soft)" }}>
              {policySections.map((s, i) => (
                <details key={s.id} className={i > 0 ? "border-t" : ""} style={{ borderColor: "var(--rule-soft)" }}>
                  <summary className="px-6 py-4 cursor-pointer flex items-center gap-4 hover:bg-[var(--accent-fill)]">
                    <span className="font-mono text-[10px] tabular-nums tracking-widest shrink-0" style={{ color: "var(--accent)" }}>§ {s.num}</span>
                    <span className="font-serif-jp font-black text-[16px] flex-1" style={{ color: "var(--ink)" }}>{s.title}</span>
                    <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>{s.summary}</span>
                  </summary>
                  <div className="px-6 pb-5 pt-1 text-[13px] leading-[1.9]" style={{ color: "var(--ink-body)" }}>{s.body}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.PrivacyOptionB = PrivacyOptionB;
