// Shared building blocks & mock article content for docs page designs.

const articleMeta = {
  category: "civil-construction-1",
  categoryLabel: "1級土木施工管理技士",
  groupLabel: "教科書",
  title: "コンクリートの配合設計 — W/C比と単位水量の決め方",
  publishedAt: "2026.04.18",
  updatedAt: "2026.05.16",
  readMin: 12,
  tags: ["コンクリート", "配合設計", "品質管理", "W/C比", "単位水量"],
  slug: "concrete-mix-design",
};

const articleToc = [
  { level: 2, id: "intro", title: "はじめに — 示方配合と現場配合", num: "1" },
  { level: 2, id: "wc-ratio", title: "W/C比の決め方", num: "2" },
  { level: 3, id: "wc-strength", title: "圧縮強度から求める", num: "2.1" },
  { level: 3, id: "wc-durability", title: "耐久性から求める", num: "2.2" },
  { level: 2, id: "unit-water", title: "単位水量の上限", num: "3" },
  { level: 2, id: "air-content", title: "空気量の設定", num: "4" },
  { level: 2, id: "trial-mix", title: "試し練りによる現場配合の決定", num: "5" },
  { level: 2, id: "summary", title: "まとめ — 配合設計のチェックリスト", num: "6" },
];

// Reusable prose-styled article body (used by all docs options)
function ArticleBody({ compact = false, withInlineAffiliate = false, withInlineAds = false, withSectionAffiliate = false }) {
  const { IconBook, IconExternal, IconStar, IconBolt, IconCheck } = Icons;
  const { BookCover, StarRow, AmazonButton } = Shared;
  const { mockBooks } = MockData;

  const P = ({ children }) => <p className="text-[16px] leading-[1.95] my-5" style={{ color: "var(--ink-body)" }}>{children}</p>;
  const H2 = ({ id, children }) => (
    <h2 id={id} className="font-serif-jp font-black mt-12 mb-4 leading-snug text-[22px]" style={{ color: "var(--ink)" }}>{children}</h2>
  );
  const H3 = ({ id, children }) => (
    <h3 id={id} className="font-serif-jp font-semibold mt-10 mb-4 text-[20px] pl-4 py-1 border-l-4 leading-snug"
      style={{ color: "var(--ink)", borderColor: "#60a5fa" }}>{children}</h3>
  );

  const Callout = ({ kind, title, children }) => {
    const colors = {
      formula: { bg: "#eef2ff", bd: "#6366f1", fg: "#3730a3" },
      note: { bg: "#eff6ff", bd: "#3b82f6", fg: "#1d4ed8" },
      standard: { bg: "#f5f3ff", bd: "#8b5cf6", fg: "#5b21b6" },
      warn: { bg: "#fffbeb", bd: "#f59e0b", fg: "#b45309" },
    }[kind] || { bg: "#f8fafc", bd: "#64748b", fg: "#334155" };
    return (
      <div className="relative my-6 px-4 py-4 border-l-4 callout-body"
        style={{ background: colors.bg, borderColor: colors.bd }}>
        {title && (
          <div className="absolute -top-2.5 left-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
            style={{ background: colors.bd, color: "#fff" }}>{title}</div>
        )}
        <div className="text-[14px] leading-[1.85] pt-1" style={{ color: colors.fg }}>{children}</div>
      </div>
    );
  };

  // Inline affiliate callout — styled as MDX content
  const InlineRef = ({ b, idx, note }) => (
    <div className="my-7 p-5 border-2" style={{ borderColor: "var(--amazon)", background: "#fdf6ee" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--amazon)" }}>
          <IconBook className="w-3 h-3" />編集部ノート · この章を深掘りする本
        </div>
        <span className="pr-tag" style={{ borderColor: "var(--amazon)", color: "var(--amazon)" }}>PR</span>
      </div>
      <div className="flex gap-4">
        <BookCover book={b} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-serif-jp font-bold text-[15px] leading-snug mb-1" style={{ color: "var(--ink)", whiteSpace: "pre-line" }}>{b.title}</div>
          <div className="font-mono text-[10px] mb-2" style={{ color: "var(--ink-muted)" }}>{b.author}</div>
          <p className="text-[12px] leading-[1.85] mb-3" style={{ color: "var(--ink-body)" }}>{note}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <StarRow rating={b.rating} />
            <span className="font-serif-jp font-bold text-[15px] tabular-nums" style={{ color: "var(--ink)" }}>{b.price}</span>
            <AmazonButton size="sm" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="prose-body">
      <H2 id="intro">1. はじめに — 示方配合と現場配合</H2>
      <P>
        コンクリートの配合設計は、構造物に要求される強度・耐久性・施工性を満たすために、セメント・水・骨材・混和材料の量を決める作業である。配合は <strong style={{ color: "var(--ink)" }}>示方配合</strong>（仕様として与えられる配合）と <strong style={{ color: "var(--ink)" }}>現場配合</strong>（骨材の含水状態を補正した実際の配合）に分けられ、両者を区別して扱う必要がある。
      </P>
      <P>
        1級土木施工管理技士 第1次検定では、毎年 W/C 比・単位水量・空気量の組み合わせが頻出論点となっている。本記事では、配合設計の手順を JIS A 5308 および土木学会コンクリート示方書 [施工編] に沿って整理する。
      </P>

      <Callout kind="note" title="この記事で扱う範囲">
        本記事は配合設計の基本（W/C比・単位水量・空気量の決定）を対象とする。鉄筋コンクリート構造物の設計強度・耐久性照査は別記事 <a href="#" className="underline" style={{ color: "var(--accent)" }}>コンクリートの耐久性設計</a> で扱う。
      </Callout>

      {withInlineAds && !compact && (
        <div className="my-6 ad-slot" style={{ height: 120 }}>
          <div className="text-center">
            <div style={{ letterSpacing: "0.18em" }}>Google AdSense — In-article</div>
            <div className="text-[11px] mt-1">Responsive</div>
          </div>
        </div>
      )}

      <H2 id="wc-ratio">2. W/C比の決め方</H2>
      <P>
        水セメント比 W/C は、コンクリートの強度・耐久性を決める最も重要なパラメータである。配合設計では、要求性能に応じて以下の2つの観点から W/C 比を求め、<strong style={{ color: "var(--ink)" }}>小さい方の値を採用</strong>する。
      </P>

      <H3 id="wc-strength">2.1 圧縮強度から求める</H3>
      <P>
        設計基準強度 F<sub>c</sub> から配合強度 F<sub>m</sub> を求め、強度比 F<sub>m</sub>/F<sub>c</sub> を用いて W/C 比を逆算する。
      </P>

      <Callout kind="formula" title="配合強度の式">
        F<sub>m</sub> = F<sub>c</sub> + t × σ &nbsp;&nbsp; (t = 1.73, σ = 標準偏差)<br />
        既往の実績がない場合、σ = 0.18 × F<sub>c</sub> として概算する。
      </Callout>

      <H3 id="wc-durability">2.2 耐久性から求める</H3>
      <P>
        中性化・塩害・凍害などの劣化要因に対する耐久性照査から、W/C 比の上限を決める。一般的な土木構造物では下記が目安となる。
      </P>

      {withSectionAffiliate && <InlineRef b={mockBooks[2]} idx={1} note="土木学会コンクリート示方書の解説書。W/C比の照査手順が章ごとに整理されており、本章の理解の決定版。編集部 N も実務で参照中。" />}

      <table className="w-full text-[13px] my-6 border" style={{ borderColor: "var(--rule-soft)" }}>
        <thead>
          <tr style={{ background: "var(--accent-fill)" }}>
            <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>環境区分</th>
            <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>W/C 上限</th>
            <th className="text-left px-3 py-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>最小被り (mm)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["一般環境", "65%", "30"],
            ["腐食性環境（塩害）", "50%", "70"],
            ["高腐食性環境", "45%", "90"],
            ["凍害環境", "55%", "50"],
          ].map(([a,b,c]) => (
            <tr key={a} style={{ borderTop: "1px solid var(--rule-soft)" }}>
              <td className="px-3 py-2 font-bold tabular-nums" style={{ color: "var(--ink)" }}>{a}</td>
              <td className="px-3 py-2 tabular-nums" style={{ color: "var(--ink-body)" }}>{b}</td>
              <td className="px-3 py-2 tabular-nums" style={{ color: "var(--ink-body)" }}>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2 id="unit-water">3. 単位水量の上限</H2>
      <P>
        単位水量は、ひび割れ抵抗性とポンプ圧送性の両面から上限が定められる。土木学会示方書では、<strong style={{ color: "var(--ink)" }}>175 kg/m³ を標準上限</strong>とし、これを超える場合は配合の妥当性を別途検証する。
      </P>
      <P>
        単位水量を抑えるには、(1) スランプを必要最小限とする、(2) 粗骨材最大寸法を大きくする、(3) AE 減水剤・高性能 AE 減水剤を活用する、の3点が基本となる。
      </P>

      <Callout kind="standard" title="JIS A 5308 抜粋">
        レディーミクストコンクリートの単位水量は、設計上 175 kg/m³ 以下を原則とする。やむを得ず超過する場合は、配合報告書にその理由と検証結果を明記しなければならない。
      </Callout>

      {withInlineAffiliate && !withSectionAffiliate && <InlineRef b={mockBooks[2]} idx={1} note="単位水量の制限と配合の関係を、章末の演習問題で確認できる。" />}

      <H2 id="air-content">4. 空気量の設定</H2>
      <P>
        空気量は、ワーカビリティ向上と耐凍害性確保のために 4.5 ± 1.5% を標準とする。AE 剤の添加量で調整し、現場では <strong style={{ color: "var(--ink)" }}>圧力法（JIS A 1128）</strong>で測定する。
      </P>
      <P>
        過度な空気量は強度低下を招くため、目標空気量を超えた場合は配合を見直す。粗骨材最大寸法が大きいほど、必要な空気量はやや小さくなる。
      </P>

      <H2 id="trial-mix">5. 試し練りによる現場配合の決定</H2>
      <P>
        示方配合に対し、骨材の含水状態を補正して現場配合を決定する。施工開始前に <strong style={{ color: "var(--ink)" }}>試し練り</strong>を実施し、以下の3点を確認する。
      </P>
      <ul className="list-disc pl-6 my-5 space-y-2 text-[16px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
        <li>スランプ：目標値 ± 2.5 cm</li>
        <li>空気量：目標値 ± 1.5%</li>
        <li>圧縮強度：材齢 28 日の供試体で配合強度以上</li>
      </ul>

      <Callout kind="warn" title="現場配合における注意">
        試し練りで目標値を満たさない場合、まず混和剤量で微調整を試み、改善しない場合のみ配合を再設計する。安易に水量を増やして調整するのは、強度・耐久性低下の原因となる。
      </Callout>

      {withInlineAds && !compact && (
        <div className="my-6 ad-slot" style={{ height: 120 }}>
          <div className="text-center">
            <div style={{ letterSpacing: "0.18em" }}>Google AdSense — In-article</div>
            <div className="text-[11px] mt-1">Responsive</div>
          </div>
        </div>
      )}

      <H2 id="summary">6. まとめ — 配合設計のチェックリスト</H2>
      <P>
        以下のチェックリストで配合設計の最終確認を行う。第1次検定では各項目の数値が穴埋め問題として頻出する。
      </P>
      <ul className="my-5 space-y-2 text-[15px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
        {[
          "W/C 比は強度照査と耐久性照査の小さい方を採用したか",
          "単位水量は 175 kg/m³ 以下か",
          "空気量は 4.5 ± 1.5 % の範囲か",
          "粗骨材最大寸法は構造寸法に対し適切か",
          "試し練りで現場配合を補正したか",
        ].map(c => (
          <li key={c} className="flex gap-2 items-start">
            <IconCheck className="w-4 h-4 mt-1 shrink-0" style={{ color: "var(--accent)" }} />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Author card (used at end of article)
function AuthorCard() {
  const { IconAward } = Icons;
  return (
    <div className="mt-8 bg-white border p-6" style={{ borderColor: "var(--rule-soft)" }}>
      <div className="flex items-start gap-4">
        <div className="avatar w-16 h-16 rounded-full text-2xl shrink-0">N</div>
        <div className="flex-1">
          <div className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>Written by</div>
          <div className="font-serif-jp font-bold text-[18px]" style={{ color: "var(--ink)" }}>編集部 N</div>
          <div className="text-[12px] mt-1 mb-3" style={{ color: "var(--ink-muted)" }}>土木コンサル勤務 / 1級土木施工 / 技術士（建設・総監）</div>
          <p className="text-[13px] leading-[1.85]" style={{ color: "var(--ink-body)" }}>
            この記事は、土木学会コンクリート示方書 [施工編]（2017）および JIS A 5308 を主要文献として、現場での適用上の留意点を加筆したものです。
          </p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t flex flex-wrap gap-4 font-mono text-[11px] tabular-nums" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
        <span>公開 {articleMeta.publishedAt}</span>
        <span aria-hidden>·</span>
        <span>最終更新 {articleMeta.updatedAt}</span>
      </div>
    </div>
  );
}

window.DocsShared = { articleMeta, articleToc, ArticleBody, AuthorCard };
