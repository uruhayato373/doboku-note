// Privacy Option C — Specification Sheet
// 仕様書スタイルに振り切る。すべてを構造化された表で表示し、エンジニア・実務者
// に「読まなくても探せる」を提供。土木業界のユーザーに馴染む形式。

function PrivacyOptionC() {
  const { Header, Footer } = Shared;
  const { policySections, thirdPartyServices, cookieCategories } = PrivacyMock;
  const { IconShield, IconExternal, IconCheck, IconChart } = Icons;

  // Build a structured spec from policySections
  const specRows = [
    { id: "doc", label: "Document", v: "doboku-note Privacy Policy" },
    { id: "ver", label: "Version", v: "2.1.0" },
    { id: "eff", label: "Effective date", v: "2026-04-05" },
    { id: "rev", label: "Last reviewed", v: "2026-05-01" },
    { id: "law", label: "Compliance", v: "個人情報保護法 / 特定商取引法 / GDPR Art. 6, 7, 13–22" },
    { id: "ctrl", label: "Data controller", v: "doboku-note 編集部 (N)" },
    { id: "dpo", label: "DPO contact", v: "privacy@doboku-note.com" },
  ];

  const dataCategories = [
    { code: "DC-01", name: "技術情報", items: "IP, User-Agent, OS, ブラウザ", legal: "正当な利益 (GDPR 6(1)(f))", retention: "26 months", deletion: "自動" },
    { code: "DC-02", name: "行動情報", items: "ページビュー, クリック, セッション", legal: "同意 (GDPR 6(1)(a))", retention: "26 months", deletion: "自動" },
    { code: "DC-03", name: "問い合わせ", items: "氏名, 連絡先, 本文", legal: "契約履行 (GDPR 6(1)(b))", retention: "5 years", deletion: "請求時即時" },
    { code: "DC-04", name: "ニュースレター", items: "メール, 開封, クリック", legal: "同意 (GDPR 6(1)(a))", retention: "解除まで", deletion: "請求時即時" },
    { code: "DC-05", name: "コメント", items: "本文, 投稿日時, IP", legal: "同意 (GDPR 6(1)(a))", retention: "解除まで", deletion: "請求時即時" },
  ];

  const rightsMatrix = [
    { right: "開示請求", art: "GDPR 15", method: "問い合わせフォーム", sla: "30 日以内", verify: "メール認証" },
    { right: "訂正請求", art: "GDPR 16", method: "問い合わせフォーム", sla: "30 日以内", verify: "メール認証" },
    { right: "削除請求", art: "GDPR 17", method: "問い合わせフォーム / 設定", sla: "30 日以内", verify: "メール認証 + 確認" },
    { right: "処理制限", art: "GDPR 18", method: "問い合わせフォーム", sla: "30 日以内", verify: "メール認証" },
    { right: "ポータビリティ", art: "GDPR 20", method: "問い合わせフォーム", sla: "30 日以内", verify: "メール認証" },
    { right: "異議申立", art: "GDPR 21", method: "問い合わせフォーム", sla: "30 日以内", verify: "メール認証" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Spec header */}
        <section className="border-b-2 py-10 bg-white" style={{ borderColor: "var(--ink)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>Privacy</span>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>Specification</span>
            </nav>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-7">
                <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--accent)" }}>SPEC SHEET · DN-PRIV-001</div>
                <h1 className="font-serif-jp font-black text-[var(--ink)] text-[44px] tracking-tight leading-[1.15]">
                  プライバシーポリシー仕様書
                </h1>
              </div>
              <div className="col-span-5 border-2 p-4" style={{ borderColor: "var(--ink)" }}>
                <table className="w-full text-[12px]">
                  <tbody>
                    {specRows.slice(0,5).map(r => (
                      <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--rule-soft)" }}>
                        <td className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{r.label}</td>
                        <td className="py-1.5 font-mono tabular-nums" style={{ color: "var(--ink)" }}>{r.v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* §1 — Scope */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 1</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>適用範囲</h2>
              </div>
              <div className="col-span-9">
                <p className="text-[14px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>
                  本仕様書は、doboku-note (https://doboku-note.com) およびそのサブドメインで提供される一切のサービスに適用される。当サイトが個人情報の取扱いに関して遵守すべき要件を定義する。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* §2 — Data inventory */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 2</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>データ目録</h2>
              </div>
              <div className="col-span-9">
                <p className="text-[14px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>当サイトが取得しうる個人情報を、カテゴリコード（DC-NN）で識別する。各カテゴリの取得根拠・保持期間は下記の通り。</p>
              </div>
            </div>
            <table className="w-full text-[12px] border" style={{ borderColor: "var(--ink)" }}>
              <thead>
                <tr style={{ background: "var(--ink)", color: "#fff" }}>
                  {["コード", "カテゴリ", "項目", "取得根拠", "保持期間", "削除"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataCategories.map(d => (
                  <tr key={d.code} className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
                    <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: "var(--accent)" }}>{d.code}</td>
                    <td className="px-3 py-2.5 font-serif-jp font-bold" style={{ color: "var(--ink)" }}>{d.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: "var(--ink-body)" }}>{d.items}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: "var(--ink-body)" }}>{d.legal}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: "var(--ink-body)" }}>{d.retention}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: "var(--ink-body)" }}>{d.deletion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* §3 — Subprocessors */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 3</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>サブプロセッサ</h2>
              </div>
              <div className="col-span-9">
                <p className="text-[14px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>個人情報の処理を委託している外部サービス。サービス追加時は本表を更新する。</p>
              </div>
            </div>
            <table className="w-full text-[12px] border" style={{ borderColor: "var(--ink)" }}>
              <thead>
                <tr style={{ background: "var(--ink)", color: "#fff" }}>
                  {["#", "Vendor", "Category", "Purpose", "Data", "Retention", "Opt-out"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {thirdPartyServices.map((svc, i) => (
                  <tr key={svc.name} className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
                    <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: "var(--ink-muted)" }}>{String(i+1).padStart(2,"0")}</td>
                    <td className="px-3 py-2.5 font-serif-jp font-bold" style={{ color: "var(--ink)" }}>{svc.name}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: "var(--accent-fill)", color: "var(--accent)" }}>{svc.category}</span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--ink-body)" }}>{svc.purpose}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: "var(--ink-body)" }}>{svc.data}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums" style={{ color: "var(--ink-body)" }}>{svc.retention}</td>
                    <td className="px-3 py-2.5">
                      {svc.optOut.startsWith("http") ? (
                        <a href={svc.optOut} className="font-mono text-[11px] underline inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
                          link <IconExternal className="w-3 h-3" />
                        </a>
                      ) : <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>{svc.optOut}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* §4 — Cookie categories */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 4</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>Cookie 分類</h2>
              </div>
              <div className="col-span-9">
                <p className="text-[14px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>当サイトで使用する Cookie は、以下 4 カテゴリに分類される。詳細設定はサイト設定画面より変更可能。</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {cookieCategories.map(c => (
                <div key={c.key} className="border-2 p-4" style={{ borderColor: c.color }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.color }}>{c.label}</div>
                    {c.required && <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: "var(--ink)", color: "#fff" }}>Required</span>}
                  </div>
                  <div className="font-serif-jp font-black text-2xl tabular-nums mb-2" style={{ color: "var(--ink)" }}>{c.count} items</div>
                  <p className="text-[11px] leading-[1.8]" style={{ color: "var(--ink-body)" }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* §5 — Rights matrix */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 5</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>権利と SLA</h2>
              </div>
              <div className="col-span-9">
                <p className="text-[14px] leading-[1.95]" style={{ color: "var(--ink-body)" }}>ユーザーが行使できる権利と、当サイトの対応 SLA。すべての請求は本人確認後 30 日以内に対応する。</p>
              </div>
            </div>
            <table className="w-full text-[12px] border" style={{ borderColor: "var(--ink)" }}>
              <thead>
                <tr style={{ background: "var(--ink)", color: "#fff" }}>
                  {["権利", "根拠条文", "請求方法", "応答 SLA", "本人確認"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rightsMatrix.map(r => (
                  <tr key={r.right} className="border-b" style={{ borderColor: "var(--rule-soft)" }}>
                    <td className="px-3 py-2.5 font-serif-jp font-bold" style={{ color: "var(--ink)" }}>{r.right}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: "var(--accent)" }}>{r.art}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--ink-body)" }}>{r.method}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums" style={{ color: "var(--ink-body)" }}>{r.sla}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--ink-body)" }}>{r.verify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* §6 — Security */}
        <section className="py-10 bg-white border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6 mb-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 6</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>技術的措置</h2>
              </div>
              <div className="col-span-9">
                <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                  {[
                    "TLS 1.3 (全通信暗号化)",
                    "HSTS preload",
                    "CSP (Content Security Policy)",
                    "管理画面 二要素認証",
                    "Vercel 監査ログ常時記録",
                    "Cloudflare WAF",
                    "依存ライブラリの自動アップデート (Dependabot)",
                    "本番 DB の AES-256 暗号化",
                  ].map(s => (
                    <li key={s} className="flex gap-2"><IconCheck className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: "var(--accent)" }} /><span style={{ color: "var(--ink-body)" }}>{s}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* §7 — Contact */}
        <section className="py-10 bg-white">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>§ 7</div>
                <h2 className="font-serif-jp font-black text-2xl" style={{ color: "var(--ink)" }}>窓口</h2>
              </div>
              <div className="col-span-9">
                <div className="border-2 p-5" style={{ borderColor: "var(--ink)" }}>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {specRows.slice(5).concat([
                        { id: "lang", label: "Response language", v: "日本語 / English" },
                        { id: "sla", label: "Response SLA", v: "7 営業日以内 (初回) / 30 日以内 (完了)" },
                      ]).map(r => (
                        <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--rule-soft)" }}>
                          <td className="py-2 pr-5 font-mono text-[11px] uppercase tracking-widest align-top" style={{ color: "var(--ink-muted)" }}>{r.label}</td>
                          <td className="py-2 font-mono tabular-nums" style={{ color: "var(--ink)" }}>{r.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

window.PrivacyOptionC = PrivacyOptionC;
