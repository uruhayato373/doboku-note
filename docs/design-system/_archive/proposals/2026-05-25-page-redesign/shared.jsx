// Shared components: Header, Footer, icons, and mock data used by all options.

const Icon = ({ d, className = "w-5 h-5", viewBox = "0 0 24 24", stroke = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d}
  </svg>
);

const IconSearch = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />;
const IconHardHat = (p) => <Icon {...p} d={<><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></>} />;
const IconCap = (p) => <Icon {...p} d={<><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></>} />;
const IconBook = (p) => <Icon {...p} d={<><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></>} />;
const IconUser = (p) => <Icon {...p} d={<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />;
const IconArrow = (p) => <Icon {...p} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />;
const IconFile = (p) => <Icon {...p} d={<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>} />;
const IconHash = (p) => <Icon {...p} d={<><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>} />;
const IconCal = (p) => <Icon {...p} d={<><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>} />;
const IconAward = (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></>} />;
const IconNotebook = (p) => <Icon {...p} d={<><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M16 2v20"/></>} />;
const IconCart = (p) => <Icon {...p} d={<><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>} />;
const IconCheck = (p) => <Icon {...p} d={<><path d="M20 6 9 17l-5-5"/></>} />;
const IconStar = (p) => <Icon {...p} d={<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>} />;
const IconBolt = (p) => <Icon {...p} d={<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></>} />;
const IconTrend = (p) => <Icon {...p} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />;
const IconClock = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const IconChevron = (p) => <Icon {...p} d={<><path d="m9 18 6-6-6-6"/></>} />;
const IconLock = (p) => <Icon {...p} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const IconPlay = (p) => <Icon {...p} d={<><polygon points="6 3 20 12 6 21 6 3"/></>} />;
const IconLayers = (p) => <Icon {...p} d={<><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m2 12 8.58 3.91a2 2 0 0 0 1.65 0L22 12"/><path d="m2 17 8.58 3.91a2 2 0 0 0 1.65 0L22 17"/></>} />;
const IconShield = (p) => <Icon {...p} d={<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></>} />;
const IconChart = (p) => <Icon {...p} d={<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />;
const IconExternal = (p) => <Icon {...p} d={<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>} />;
const IconPin = (p) => <Icon {...p} d={<><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></>} />;
const IconQuote = (p) => <Icon {...p} d={<><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></>} />;

window.Icons = {
  IconSearch, IconHardHat, IconCap, IconBook, IconUser, IconArrow, IconFile, IconHash,
  IconCal, IconAward, IconNotebook, IconCart, IconCheck, IconStar, IconBolt, IconTrend,
  IconClock, IconChevron, IconLock, IconPlay, IconLayers, IconShield, IconChart,
  IconExternal, IconPin, IconQuote,
};

// ===== Mock data =====
const mockArticles = [
  { slug: "concrete-mix-design", title: "コンクリートの配合設計 — W/C比と単位水量の決め方", category: "civil-construction-1", categoryLabel: "1級土木施工", date: "2026.05.16", tags: ["コンクリート", "配合設計"], readMin: 12 },
  { slug: "earth-retaining-walls", title: "土留め工の選定と背面土圧の見方", category: "civil-construction-1", categoryLabel: "1級土木施工", date: "2026.05.12", tags: ["土工", "仮設工"], readMin: 9 },
  { slug: "safety-management-ms", title: "総合技術監理の安全管理 — リスクマトリクス活用", category: "pe-comprehensive-management", categoryLabel: "技術士 総監", date: "2026.05.08", tags: ["安全管理", "キーワード"], readMin: 15 },
  { slug: "asphalt-pavement-quality", title: "アスファルト舗装の品質管理 — 締固め度の判定", category: "civil-construction-1", categoryLabel: "1級土木施工", date: "2026.05.05", tags: ["舗装", "品質管理"], readMin: 10 },
  { slug: "economic-analysis-mlcc", title: "総監の経済性管理 — ライフサイクルコスト演習", category: "pe-comprehensive-management", categoryLabel: "技術士 総監", date: "2026.05.01", tags: ["経済性", "演習"], readMin: 18 },
  { slug: "river-revetment", title: "河川護岸工 — 設計外力と粗度係数の整理", category: "civil-construction-1", categoryLabel: "1級土木施工", date: "2026.04.27", tags: ["河川", "護岸"], readMin: 11 },
];

const mockBooks = [
  { id: "b1", title: "1級土木施工管理技士\n第1次検定 完全攻略", author: "受験対策研究会", price: "¥3,520", rating: 4.6, reviews: 184, color: "blue", badge: "ベストセラー" },
  { id: "b2", title: "技術士総監\n2026年版 キーワード集", author: "日本技術士会編", price: "¥4,180", rating: 4.4, reviews: 92, color: "orange", badge: "新刊" },
  { id: "b3", title: "コンクリート工学\n標準示方書 [施工編]", author: "土木学会", price: "¥6,820", rating: 4.8, reviews: 67, color: "gray", badge: "定番" },
  { id: "b4", title: "1級土木\n第2次検定 経験記述\n合格論文集", author: "土木技術書院", price: "¥2,970", rating: 4.5, reviews: 121, color: "green", badge: "" },
  { id: "b5", title: "総監\n択一式問題集\n2026", author: "建設技術出版", price: "¥3,300", rating: 4.3, reviews: 58, color: "maroon", badge: "" },
  { id: "b6", title: "土質力学\n基礎から実務まで", author: "鹿島技術研究所", price: "¥4,950", rating: 4.7, reviews: 43, color: "olive", badge: "" },
];

const mockPaidNotes = [
  { vol: "Vol. 04", title: "1級土木 第2次検定\n経験記述「品質管理」13テーマ", price: "¥1,480", buyers: "1,240+", lastUpdate: "2026.05.10" },
  { vol: "Vol. 03", title: "総監キーワード総まくり\n出題傾向5年分", price: "¥2,200", buyers: "680+", lastUpdate: "2026.04.22" },
  { vol: "Vol. 02", title: "1級土木 第1次検定\n直前チェック120問", price: "¥980", buyers: "2,100+", lastUpdate: "2026.04.15" },
];

window.MockData = { mockArticles, mockBooks, mockPaidNotes };

// ===== Reusable building blocks =====

function Header() {
  const { IconSearch, IconHardHat, IconCap, IconBook, IconUser } = Icons;
  const navItems = [
    { label: "検索", Icon: IconSearch, href: "#" },
    { label: "1級土木施工", Icon: IconHardHat, href: "#" },
    { label: "技術士総監", Icon: IconCap, href: "#" },
    { label: "参考書", Icon: IconBook, href: "#" },
    { label: "About", Icon: IconUser, href: "#" },
  ];
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b" style={{ borderColor: "var(--rule-soft)" }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-[72px]">
          <a href="#" className="flex items-baseline gap-3 hover:opacity-80 transition-opacity">
            <span className="font-serif-jp text-[32px] font-black tracking-tight leading-none" style={{ color: "var(--ink)" }}>doboku</span>
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>— note</span>
          </a>
          <nav className="flex items-center gap-1">
            {navItems.map(({ label, Icon }) => (
              <a key={label} href="#" className="flex flex-col items-center gap-1 px-3 py-2 rounded-card-inline hover:bg-[var(--accent-fill)] transition-colors" style={{ color: "var(--ink-body)" }}>
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{label}</span>
              </a>
            ))}
            <div className="ml-2 pl-3 border-l" style={{ borderColor: "var(--rule-soft)" }}>
              <button className="p-2 rounded-card-inline hover:bg-[var(--accent-fill)] transition-colors" aria-label="dark mode">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white mt-12" style={{ borderColor: "var(--rule-soft)" }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-4 gap-8 text-sm">
          <div className="col-span-2">
            <div className="flex items-baseline gap-2">
              <span className="font-serif-jp text-2xl font-black tracking-tight" style={{ color: "var(--ink)" }}>doboku</span>
              <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>— note</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed max-w-[42ch]" style={{ color: "var(--ink-muted)" }}>
              土木系資格試験の対策ノート。1級土木施工管理技士および技術士（総合技術監理部門）の学習コンテンツを公開。
            </p>
            <p className="mt-4 text-[11px] leading-relaxed max-w-[48ch] p-3 border" style={{ color: "var(--ink-muted)", borderColor: "var(--rule-soft)", background: "#fafafa" }}>
              <span className="font-mono uppercase tracking-widest text-[10px]" style={{ color: "var(--accent)" }}>Affiliate Disclosure</span><br/>
              当サイトは Amazon アソシエイト・楽天アフィリエイト等のプログラムに参加しており、紹介リンクから収益を得ています。掲載内容は編集部の独立した判断によります。
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Categories</div>
            <ul className="space-y-2">
              <li><a href="#" style={{ color: "var(--ink-body)" }}>1級土木施工管理技士</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>技術士（総合技術監理部門）</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>参考書ガイド</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>有料note</a></li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-muted)" }}>Site</div>
            <ul className="space-y-2">
              <li><a href="#" style={{ color: "var(--ink-body)" }}>About</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>Privacy</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>Terms</a></li>
              <li><a href="#" style={{ color: "var(--ink-body)" }}>Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t flex justify-between text-[11px] font-mono flex-wrap gap-2" style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)" }}>
          <span>© 2026 doboku-note</span>
          <span>Built with Next.js · Tailwind · MDX</span>
        </div>
      </div>
    </footer>
  );
}

// Book card — reusable affiliate building block
function BookCover({ book, size = "md" }) {
  const sizes = {
    sm: { w: 80, h: 112, titleFs: 11 },
    md: { w: 112, h: 156, titleFs: 13 },
    lg: { w: 140, h: 196, titleFs: 15 },
    xl: { w: 180, h: 252, titleFs: 18 },
  };
  const s = sizes[size];
  return (
    <div className={`book-cover ${book.color || "blue"}`} style={{ width: s.w, height: s.h }}>
      <div className="spine" />
      <div className="top-band">DOBOKU · 2026</div>
      <div className="title" style={{ fontSize: s.titleFs, whiteSpace: "pre-line" }}>{book.title}</div>
      <div className="bottom-band">{book.author}</div>
    </div>
  );
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.round(rating);
        return (
          <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={filled ? "#e6a817" : "none"} stroke="#e6a817" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        );
      })}
    </div>
  );
}

function AmazonButton({ label = "Amazon で見る", size = "md" }) {
  const ps = size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]";
  return (
    <button className={`inline-flex items-center gap-2 font-mono uppercase tracking-widest font-semibold border ${ps}`}
      style={{ background: "#fff", color: "var(--amazon)", borderColor: "var(--amazon)" }}>
      <span>{label}</span>
      <Icons.IconExternal className="w-3 h-3" />
    </button>
  );
}

window.Shared = { Header, Footer, BookCover, StarRow, AmazonButton };
