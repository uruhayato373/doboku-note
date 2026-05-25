// Shared building blocks for search-page designs.

const mockSearchQuery = "コンクリート 配合設計";

const mockSearchResults = [
  {
    slug: "concrete-mix-design",
    title: "コンクリートの配合設計 — W/C比と単位水量の決め方",
    excerpt: "示方<mark>配合</mark>と現場<mark>配合</mark>の違い、<mark>コンクリート</mark>の単位水量と空気量の関係を整理。第1次検定における頻出論点を含めて解説。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "配合設計", "品質管理"],
    date: "2026.05.16",
    readMin: 12,
    score: 98,
  },
  {
    slug: "concrete-slump",
    title: "スランプ試験 — 試験方法と判定基準",
    excerpt: "<mark>コンクリート</mark>のワーカビリティを評価するスランプ試験の手順と、<mark>配合</mark>修正の判断基準を整理。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "試験", "品質管理"],
    date: "2026.04.30",
    readMin: 8,
    score: 92,
  },
  {
    slug: "concrete-durability",
    title: "コンクリートの耐久性設計 — 中性化と塩害",
    excerpt: "耐久性照査の指標と、W/C比、被り厚さ、混和材による<mark>配合</mark>調整の考え方。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "耐久性", "設計"],
    date: "2026.04.22",
    readMin: 14,
    score: 87,
  },
  {
    slug: "concrete-keyword",
    title: "キーワード: コンクリート",
    excerpt: "セメント + 水 + 骨材 + 混和材料の硬化体。土木構造物の主要材料として、品質・<mark>配合</mark>・施工の各段階で標準が定められている。",
    category: "civil-construction-1",
    categoryLabel: "用語",
    tags: ["キーワード", "コンクリート"],
    date: "2026.04.10",
    readMin: 4,
    score: 81,
  },
  {
    slug: "concrete-mix-trial",
    title: "試し練り — 現場配合の決定プロセス",
    excerpt: "示方<mark>配合</mark>から現場<mark>配合</mark>へ移す際の、試し練りの実施要領と判定基準。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "配合設計"],
    date: "2026.04.03",
    readMin: 10,
    score: 76,
  },
  {
    slug: "concrete-admixture",
    title: "混和材料の種類と用途 — AE剤・減水剤・フライアッシュ",
    excerpt: "<mark>コンクリート</mark>の品質改善に用いられる混和材料の役割と、<mark>配合</mark>への影響。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "材料"],
    date: "2026.03.27",
    readMin: 11,
    score: 71,
  },
  {
    slug: "concrete-curing",
    title: "養生 — 温度・湿度・期間の管理",
    excerpt: "<mark>コンクリート</mark>強度発現に影響する養生条件。初期養生・後期養生の区分。",
    category: "civil-construction-1",
    categoryLabel: "1級土木施工",
    tags: ["コンクリート", "施工"],
    date: "2026.03.20",
    readMin: 9,
    score: 67,
  },
];

const mockPopularQueries = [
  "経験記述 品質管理",
  "総監 リスクマトリクス",
  "コンクリート 配合設計",
  "アスファルト 締固め度",
  "土留め 背面土圧",
  "技術士 口頭試験",
  "施工計画 安全管理",
  "盛土 軟弱地盤",
];

const mockRelatedKeywords = [
  "示方配合", "現場配合", "W/C比", "単位水量", "スランプ", "空気量",
  "混和剤", "セメント", "粗骨材", "細骨材", "養生", "強度試験",
];

window.SearchMock = { mockSearchQuery, mockSearchResults, mockPopularQueries, mockRelatedKeywords };

// SearchBox — editorial styled, large
function SearchBox({ query = "", filled = true, size = "md" }) {
  const { IconSearch } = Icons;
  const big = size === "lg";
  return (
    <div className="relative w-full">
      <div className={`flex items-center bg-white border-2 ${big ? "h-16" : "h-12"} px-4`}
        style={{ borderColor: "var(--ink)" }}>
        <IconSearch className={`${big ? "w-6 h-6" : "w-5 h-5"} shrink-0`} stroke={2} />
        <input
          type="text"
          defaultValue={filled ? query : ""}
          placeholder="キーワードを入力して検索…"
          className={`flex-1 bg-transparent outline-none px-4 font-serif-jp ${big ? "text-[22px]" : "text-[16px]"} font-bold tabular-nums`}
          style={{ color: "var(--ink)" }}
        />
        {filled && (
          <button className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--ink)]" aria-label="clear">
            CLEAR ×
          </button>
        )}
        <button className={`ml-3 ${big ? "h-10 px-6" : "h-8 px-4"} font-mono uppercase tracking-widest text-[11px] font-bold`}
          style={{ background: "var(--ink)", color: "#fff" }}>
          検索
        </button>
      </div>
    </div>
  );
}

// Highlighted excerpt
function Excerpt({ html, size = "md" }) {
  const fs = size === "sm" ? "text-[13px]" : "text-[14px]";
  return (
    <p className={`${fs} leading-[1.85]`}
      style={{ color: "var(--ink-body)" }}
      dangerouslySetInnerHTML={{ __html: html.replace(/<mark>/g, '<mark style="background: #fff2a8; color: #4a3d00; padding: 0 2px;">') }}
    />
  );
}

// Filter chips
function FilterChips({ active = "all" }) {
  const filters = [
    { id: "all", label: "すべて", count: 7 },
    { id: "civil", label: "1級土木施工", count: 6 },
    { id: "pe", label: "技術士 総監", count: 0 },
    { id: "keyword", label: "キーワード", count: 1 },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map(f => {
        const on = f.id === active;
        return (
          <button key={f.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 border font-mono text-[11px] uppercase tracking-widest"
            style={{
              borderColor: on ? "var(--ink)" : "var(--rule-soft)",
              background: on ? "var(--ink)" : "#fff",
              color: on ? "#fff" : "var(--ink-body)",
              opacity: f.count === 0 ? 0.4 : 1,
            }}>
            <span>{f.label}</span>
            <span className="tabular-nums" style={{ opacity: 0.6 }}>{f.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// Single result row
function ResultRow({ r, ranked, idx }) {
  const { IconHash, IconClock } = Icons;
  return (
    <article className="py-6 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 mb-2">
        {ranked && (
          <div className="font-mono text-[10px] tabular-nums px-1.5 py-0.5"
            style={{ background: "var(--accent-fill)", color: "var(--accent)" }}>#{String(idx).padStart(2, "0")}</div>
        )}
        <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5"
          style={{ color: "var(--accent)", background: "var(--accent-fill)" }}>{r.categoryLabel}</span>
        <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--ink-muted)" }}>{r.date}</span>
        <span className="font-mono text-[10px] flex items-center gap-1 tabular-nums" style={{ color: "var(--ink-muted)" }}>
          <IconClock className="w-3 h-3" />{r.readMin}分
        </span>
        <span className="font-mono text-[10px] tabular-nums ml-auto" style={{ color: "var(--ink-muted)" }}>score {r.score}</span>
      </div>
      <h3 className="font-serif-jp font-bold text-[20px] leading-snug mb-2" style={{ color: "var(--ink)" }}>
        <a href="#" className="hover:underline" style={{ textDecorationColor: "var(--accent)", textDecorationThickness: 1, textUnderlineOffset: 4 }}>
          {r.title}
        </a>
      </h3>
      <Excerpt html={r.excerpt} />
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>/docs/{r.slug}</span>
        {r.tags.map(t => (
          <span key={t} className="font-mono text-[10px] flex items-center gap-1" style={{ color: "var(--ink-muted)" }}>
            <IconHash className="w-2.5 h-2.5" />{t}
          </span>
        ))}
      </div>
    </article>
  );
}

window.SearchShared = { SearchBox, Excerpt, FilterChips, ResultRow };
