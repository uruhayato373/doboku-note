// About Option D — Trust + Press Kit
// 「個人ブログ」ではなく「メディア」として位置づける。
// 透明性・実績・E-A-T を全面提示し、企業スポンサーシップ・B2B 提携・寄稿依頼の窓口に。
// AdSense や個人物販より高単価な「タイアップ広告」モデルへの導線を最大化。

function AboutOptionD() {
  const { Header, Footer, BookCover, StarRow, AmazonButton } = Shared;
  const { aboutAuthor, personalReadingList } = AboutMock;
  const { mockBooks, mockPaidNotes } = MockData;
  const {
    IconAward, IconCheck, IconArrow, IconExternal, IconBook, IconShield,
    IconQuote, IconTrend, IconChart, IconFile, IconHash, IconPin, IconStar
  } = Icons;

  const trafficByDevice = [
    { label: "Desktop", v: 41 },
    { label: "Mobile", v: 56 },
    { label: "Tablet", v: 3 },
  ];

  const audienceProfile = [
    { k: "受験生", v: "62%" },
    { k: "建設業 実務者", v: "28%" },
    { k: "公務員 技術職", v: "8%" },
    { k: "その他", v: "2%" },
  ];

  const partnershipFormats = [
    { name: "編集タイアップ記事", desc: "編集部が監修・執筆する PR 記事を当ノート上で配信。Sponsored 表記必須。", cap: "月 1 件まで", price: "¥330,000〜" },
    { name: "メールマガジン掲載", desc: "毎週日曜配信のニュースレター内に企業 PR セクションを掲載。", cap: "月 4 件まで", price: "¥66,000〜" },
    { name: "サイト内ディスプレイ広告", desc: "AdSense を介さない直接出稿型。300×250 / 728×90。", cap: "応相談", price: "¥110,000〜 / 月" },
    { name: "登壇・記事寄稿", desc: "イベント登壇、業界誌への寄稿、ホワイトペーパー執筆。", cap: "応相談", price: "応相談" },
  ];

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      <Header />
      <main>
        {/* Trust hero */}
        <section className="border-b-2 py-14 bg-white" style={{ borderColor: "var(--ink)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <nav className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
              <a href="#" style={{ color: "var(--ink-muted)" }}>Home</a>
              <span aria-hidden style={{ opacity: 0.6 }}>›</span>
              <span>About · Press Kit</span>
            </nav>
            <div className="grid grid-cols-12 gap-10 items-end">
              <div className="col-span-8">
                <div className="font-mono text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--accent)" }}>Media kit · 媒体資料</div>
                <h1 className="font-serif-jp font-black text-[56px] leading-[1.1] tracking-tight mb-5" style={{ color: "var(--ink)" }}>
                  doboku-note について。
                </h1>
                <p className="text-[16px] leading-[1.95] max-w-[60ch]" style={{ color: "var(--ink-body)" }}>
                  doboku-note は、土木系資格試験の受験者を主読者とする独立系の専門メディアです。1級土木施工管理技士・技術士（総合技術監理部門）を中心に、現役技術者の編集体制で運営しています。本ページでは、運営方針・実績・タイアップ可能な枠組みを開示しています。
                </p>
              </div>
              <aside className="col-span-4 grid grid-cols-2 gap-3">
                {[
                  { k: "Monthly visitors", v: "182K" },
                  { k: "Articles", v: "287" },
                  { k: "Paid readers", v: "3,200+" },
                  { k: "Newsletter", v: "4,820" },
                ].map(s => (
                  <div key={s.k} className="border-2 p-3" style={{ borderColor: "var(--ink)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>{s.k}</div>
                    <div className="font-serif-jp font-black text-2xl tabular-nums mt-1" style={{ color: "var(--ink)" }}>{s.v}</div>
                  </div>
                ))}
              </aside>
            </div>
          </div>
        </section>

        {/* Editor credentials — strong E-A-T */}
        <section className="py-14">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-4">
                <div className="avatar w-full aspect-square text-[140px] rounded-none">N</div>
                <div className="mt-4 bg-white border p-4" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>Editor</div>
                  <div className="font-serif-jp font-black text-xl" style={{ color: "var(--ink)" }}>{aboutAuthor.name}</div>
                  <div className="font-mono text-[11px] mt-1" style={{ color: "var(--accent)" }}>{aboutAuthor.title}</div>
                  <div className="mt-3 pt-3 border-t font-mono text-[10px] tabular-nums" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
                    Editorial since 2024.07 · {aboutAuthor.siteStats.sinceMonths}ヶ月
                  </div>
                </div>
              </div>
              <div className="col-span-8">
                <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>About the editor · 編集責任者</div>
                <h2 className="font-serif-jp text-3xl font-black mb-4" style={{ color: "var(--ink)" }}>編集体制と検証プロセス</h2>
                <p className="text-[15px] leading-[1.95] mb-6" style={{ color: "var(--ink-body)" }}>{aboutAuthor.bio}</p>

                {/* Verified credentials */}
                <div className="bg-white border p-6" style={{ borderColor: "var(--rule)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <IconShield className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>Verified credentials · 検証済み保有資格</div>
                  </div>
                  <ul className="grid grid-cols-2 gap-y-2 gap-x-6 text-[13px]">
                    {aboutAuthor.qualifications.map(q => (
                      <li key={q.label} className="flex items-baseline gap-2 py-1.5 border-b" style={{ borderColor: "var(--rule-soft)" }}>
                        <IconCheck className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                        <span className="flex-1" style={{ color: "var(--ink-body)" }}>{q.label}</span>
                        <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{q.year}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editorial policy — corrections, transparency */}
        <section className="py-14 bg-white border-y" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-5">
                <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Editorial policy</div>
                <h2 className="font-serif-jp text-3xl font-black mb-5" style={{ color: "var(--ink)" }}>編集方針</h2>
                <ul className="space-y-3 text-[14px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
                  {aboutAuthor.principles.map((p, i) => (
                    <li key={p} className="flex gap-3">
                      <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: "var(--accent)" }}>{String(i+1).padStart(2,"0")}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-7 bg-[var(--bg)] border p-7" style={{ borderColor: "var(--rule-soft)" }}>
                <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Corrections & disclosure</div>
                <h3 className="font-serif-jp text-xl font-black mb-3" style={{ color: "var(--ink)" }}>誤りの修正と利害関係の開示</h3>
                <ul className="space-y-3 text-[13px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
                  <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>›</span><span><strong>修正履歴</strong>：すべての記事末尾に最終更新日を記載し、内容に重大な修正を加えた場合は当該箇所に修正注記を残します。</span></li>
                  <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>›</span><span><strong>アフィリエイト</strong>：Amazon アソシエイト・楽天アフィリエイトに参加。紹介リンクには <code className="font-mono text-[11px]" style={{ background: "#fff" }}>PR</code> タグを必ず表記します。</span></li>
                  <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>›</span><span><strong>タイアップ記事</strong>：企業から金銭または物品の提供を受けて執筆された記事には、冒頭に「Sponsored」ラベルを表示します。</span></li>
                  <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>›</span><span><strong>独立性</strong>：掲載内容の編集判断は、広告主・スポンサーから独立して編集部が行います。</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Site stats / audience profile */}
        <section className="py-14">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Audience · 媒体スペック</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>読者層と媒体規模</h2>

            <div className="grid grid-cols-12 gap-6">
              {/* Big metrics */}
              <div className="col-span-7 grid grid-cols-2 gap-3">
                {[
                  { k: "Monthly Visitors (UU)", v: "182,400", chg: "+18%", chgLabel: "YoY" },
                  { k: "Monthly Pageviews", v: "642,800", chg: "+22%", chgLabel: "YoY" },
                  { k: "平均セッション時間", v: "4分32秒" },
                  { k: "リピート率", v: "47%" },
                  { k: "Search-organic 比率", v: "73%" },
                  { k: "ブックマーク数", v: "8,420" },
                ].map(m => (
                  <div key={m.k} className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--ink-muted)" }}>{m.k}</div>
                    <div className="font-serif-jp font-black text-3xl tabular-nums" style={{ color: "var(--ink)" }}>{m.v}</div>
                    {m.chg && (
                      <div className="mt-1 font-mono text-[10px] tabular-nums flex items-center gap-1" style={{ color: "var(--accent)" }}>
                        <IconTrend className="w-3 h-3" />{m.chg} <span style={{ color: "var(--ink-muted)" }}>{m.chgLabel}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Audience pie */}
              <div className="col-span-5 space-y-4">
                <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Audience composition</div>
                  <ul className="space-y-2">
                    {audienceProfile.map(a => {
                      const pct = parseInt(a.v);
                      return (
                        <li key={a.k}>
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[13px]" style={{ color: "var(--ink-body)" }}>{a.k}</span>
                            <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--ink)" }}>{a.v}</span>
                          </div>
                          <div className="h-2 bg-[var(--bg)] relative">
                            <div className="h-2 absolute left-0 top-0" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="bg-white border p-5" style={{ borderColor: "var(--rule-soft)" }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Devices</div>
                  <ul className="space-y-2">
                    {trafficByDevice.map(d => (
                      <li key={d.label}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[13px]" style={{ color: "var(--ink-body)" }}>{d.label}</span>
                          <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--ink)" }}>{d.v}%</span>
                        </div>
                        <div className="h-2 bg-[var(--bg)] relative">
                          <div className="h-2 absolute left-0 top-0" style={{ width: `${d.v}%`, background: "var(--ink)" }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership / sponsorship — rate card */}
        <section className="py-14 bg-white border-y-2" style={{ borderColor: "var(--ink)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="spec-tag mb-2" style={{ color: "var(--accent)" }}>Partnership · 提携・タイアップ</div>
                <h2 className="font-serif-jp text-3xl font-black" style={{ color: "var(--ink)" }}>企業さま向け広告メニュー</h2>
                <p className="text-[14px] mt-1.5 max-w-[60ch]" style={{ color: "var(--ink-muted)" }}>
                  土木・建設・施工管理ソフト・受験指導 等の業界に親和性の高い媒体です。透明性を保ったコラボレーションをご相談ください。
                </p>
              </div>
              <a href="#" className="px-5 py-2.5 font-mono uppercase tracking-widest text-[11px] font-bold"
                style={{ background: "var(--ink)", color: "#fff" }}>媒体資料 (PDF) → </a>
            </div>
            <div className="border" style={{ borderColor: "var(--rule)" }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ background: "var(--accent-fill)" }}>
                    <th className="text-left px-5 py-3 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>メニュー</th>
                    <th className="text-left px-5 py-3 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>内容</th>
                    <th className="text-left px-5 py-3 font-mono text-[10px] tracking-widest uppercase whitespace-nowrap" style={{ color: "var(--accent)" }}>掲載枠</th>
                    <th className="text-left px-5 py-3 font-mono text-[10px] tracking-widest uppercase whitespace-nowrap" style={{ color: "var(--accent)" }}>料金 (税別)</th>
                  </tr>
                </thead>
                <tbody>
                  {partnershipFormats.map(f => (
                    <tr key={f.name} className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
                      <td className="px-5 py-4 font-serif-jp font-bold align-top" style={{ color: "var(--ink)" }}>{f.name}</td>
                      <td className="px-5 py-4 align-top leading-[1.85]" style={{ color: "var(--ink-body)" }}>{f.desc}</td>
                      <td className="px-5 py-4 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: "var(--ink-body)" }}>{f.cap}</td>
                      <td className="px-5 py-4 align-top font-serif-jp font-black text-[16px] tabular-nums whitespace-nowrap" style={{ color: "var(--ink)" }}>{f.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <p className="text-[12px] max-w-[55ch]" style={{ color: "var(--ink-muted)" }}>
                ※ 価格はベース料金。期間・複合掲載・成果報酬モデルにも対応します。
                編集独立性を侵すご依頼（一次情報の捏造・特定書籍への誘導など）はお断りしています。
              </p>
              <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 font-mono uppercase tracking-widest text-[11px] font-bold"
                style={{ background: "var(--ink)", color: "#fff" }}>
                Contact for partnerships <IconArrow className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>

        {/* Testimonials placeholder — endorsements */}
        <section className="py-14">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="spec-tag mb-3" style={{ color: "var(--accent)" }}>Endorsements · 読者の声</div>
            <h2 className="font-serif-jp text-3xl font-black mb-8" style={{ color: "var(--ink)" }}>合格者からの便り</h2>
            <div className="grid grid-cols-3 gap-5">
              {[
                { name: "K. 様", exam: "1級土木施工 合格 (2025)", quote: "現場で覚えてきたことが、ようやく試験用語と繋がりました。記述式で書きたいことが言葉になる感覚は、当ノートを通読してから掴めるようになったと感じます。" },
                { name: "T. 様", exam: "技術士 総監 合格 (2025)", quote: "総監5管理のキーワード集が網羅されていて、暗記の縦糸として最後まで使い切りました。論文では本ノートの分類体系を意識して構成を組みました。" },
                { name: "M. 様", exam: "1級土木施工 学習中", quote: "解説が「現場での適用例」と必ずセットになっていて、ただの暗記にならないのが助かります。仕事で扱う仕様書が読みやすくなりました。" },
              ].map(t => (
                <div key={t.name} className="bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
                  <IconQuote className="w-6 h-6 mb-3" style={{ color: "var(--accent)" }} stroke={1.2} />
                  <p className="text-[13px] leading-[1.9] mb-4" style={{ color: "var(--ink-body)" }}>"{t.quote}"</p>
                  <div className="pt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
                    <div className="font-serif-jp font-bold text-[13px]" style={{ color: "var(--ink)" }}>{t.name}</div>
                    <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>{t.exam}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 bg-white border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-3 gap-8">
              {[
                { title: "読者の方", desc: "記事のご感想・誤りのご報告など、お気軽にどうぞ。", btn: "問い合わせフォーム", icon: IconFile },
                { title: "企業さま", desc: "タイアップ・スポンサーシップ・寄稿依頼など。", btn: "Partnership →", icon: IconChart },
                { title: "プレス", desc: "取材・引用・登壇依頼。媒体資料の請求はこちらから。", btn: "Press kit (PDF)", icon: IconShield },
              ].map(c => (
                <div key={c.title} className="border p-6" style={{ borderColor: "var(--rule-soft)" }}>
                  <c.icon className="w-7 h-7 mb-3" style={{ color: "var(--accent)" }} stroke={1.2} />
                  <h3 className="font-serif-jp font-black text-xl mb-2" style={{ color: "var(--ink)" }}>{c.title}</h3>
                  <p className="text-[13px] leading-[1.85] mb-4" style={{ color: "var(--ink-body)" }}>{c.desc}</p>
                  <a href="#" className="inline-flex items-center gap-2 font-mono uppercase tracking-widest text-[11px] font-bold underline" style={{ color: "var(--accent)" }}>
                    {c.btn} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

window.AboutOptionD = AboutOptionD;
