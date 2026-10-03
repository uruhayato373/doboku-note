/**
 * 収益カバレッジ ダッシュボード（オフライン・週次レビュー統合用）
 *
 * GA4 のページ別流入 × CTA クリック × 実際の CTA 配置（note 有料マガジン /
 * アフィリエイト）を突合し、「高流入なのに収益導線が無い/弱い」ページを自動検出する。
 * 2026-06-06 の手作業監査（last-minute-2026 の無導線発見）を機械化したもの。
 *
 * データソース:
 *   - GA4 の page（data/ga4/reports/<日付>.json） … ページ別流入（最新を自動選択）
 *   - GA4 の cta-clicks（同上）                   … CTA クリック（あれば。無ければ n.d.）
 *   - src/config/doc-meta-index.json                    … 全 doc の category/group/tags
 *
 * 配置の真実源:
 *   - note CTA: src/lib/magazine-placement.ts（resolvePlacement）+ note-magazines.ts（公開判定）
 *     ＋ src/lib/hub-cta.ts（もくじタイル）＋ MDX 本文の <MagazineCard>
 *   - アフィリ: src/components/docs/DocPage.tsx のサイドバー条件をミラー（下記 deriveAffiliate）
 *
 * **数える経路は「実際に描画されるもの」に揃える**（2026-08-25・DN-0133）。
 * 描画と集計がずれると、偽陰性は「配線済みの面を毎週 Must に出し続ける」（top・もくじタイル・
 * 本文カード）、偽陽性は「導線ゼロを隠す」（sidebar・/links フォールバック）形で効く。
 * どちらもレビューの意思決定を静かに歪めるので、page.tsx が読まない経路をここで数えない。
 *
 * 使い方:
 *   npx tsx .claude/scripts/report-monetization-coverage.mts
 *   npx tsx .claude/scripts/report-monetization-coverage.mts --min-users 20
 *   （出力: コンソール md + data/analysis/monetization/coverage-*.json + coverage-latest.md）
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
// basename を使う: Windows では join() が円記号区切りを返すため split("/") ではファイル名を
// 切り出せず、生成物に絶対パスがそのまま焼き込まれて commit される（2026-08-18 修正）。
// check-note-site-utm が Windows で常に 0 件になった事故（2026-07-28）と同型。
import { basename, join, sep } from "path";
import { datasetDir, datasetPath } from "../../scripts/lib/datasets.mjs";
import { listFiles } from "../../scripts/lib/fs-walk.mjs";
import { latestReportRef, readJsonOrReport } from "../../scripts/lib/metric-reports.mjs";
import { classifyDoc, isCareerDoc } from "../../src/lib/doc-classifier.ts";
import { resolvePlacement, resolveArticleMidNoteSlot, renderedMagazineCardIds } from "../../src/lib/magazine-placement.ts";
import { getPublicDocPath } from "../../src/lib/content-routes.ts";
import { getCategoryBySlug, getCategoryHubPath } from "../../src/lib/categories.ts";
import { resolveHubCta } from "../../src/lib/hub-cta.ts";
import { getMagazine, NOTE_MAGAZINES } from "../../src/lib/note-magazines.ts";
import { sidebarProduct } from "../../src/lib/sidebar-discovery.ts";
import {
  resolveCategoryCareerAds,
  resolveDocsCareerSidebarAd,
} from "../../src/config/affiliate-creatives.ts";

const ROOT = process.cwd(); // root-ok: テストが一時ディレクトリを cwd にして実行する
const OUT_DIR = join(ROOT, datasetDir("analysis.monetization-coverage"));
const META_INDEX = join(ROOT, "src/config/doc-meta-index.json");
const SALES_LOG = join(ROOT, datasetPath("note.sales"));

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : fallback;
}
const MIN_USERS = arg("--min-users", 15); // gap 判定の高流入しきい値

const REPORT_OF_PREFIX: Record<string, string> = {
  "ga4-page-": "ga4.page",
  "ga4-cta-clicks-": "ga4.cta-clicks",
  "ga4-cta-clicks-by-placement-": "ga4.cta-clicks-by-placement",
  "ga4-cta-clicks-by-label-": "ga4.cta-clicks-by-label",
};
/** 種類の最新レポートの参照（「ファイル#枠」・GA4 は日ごとの 1 ファイル） */
function latest(prefix: string): string | null {
  return latestReportRef(ROOT, REPORT_OF_PREFIX[prefix]);
}

function normPath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

// ── アフィリエイト サイドバー配置の導出（page.tsx のミラー。SoT は page.tsx） ──
// 記事の転職creativeはカテゴリ・slugで出し分ける（記事末・中間で共用）。
// 2026-09-26に記事サイドバーの広告は撤去された。
function deriveAffiliate(category: string, slug: string): string | null {
  // サイドバー転職枠のプログラム名（"BuildJob" / "GKS" / "DXConsulting"）。trackLabel = "{program}-sidebar"。
  return resolveDocsCareerSidebarAd(category, slug).trackLabel.replace(/-sidebar$/, "");
}

// ── 本文に直接置かれた <MagazineCard>（MDX 内・placement を経由しない note 導線） ──
// placement（top/inline）と もくじタイルに加えて、**MDX 本文へ直に書かれたカード**が第 3 の
// 経路として存在する。2026-08-25 まで数えておらず、12 本を「note 導線ゼロ」と誤って扱っていた
// （例: pe-construction の学習法系 7 本は本文カードだけで送客している）。
// 実測の起点は management-tradeoffs — sidebar 廃止（DN-0133）で placement が空になるが、
// 本文には <MagazineCard> が 3 枚あって導線は生きている。
function indexBodyMagazineCards(): Map<string, { body: string; ids: string[] }> {
  const out = new Map<string, { body: string; ids: string[] }>();
  const siteDir = join(ROOT, "content/site");
  if (!existsSync(siteDir)) return out;
  for (const abs of listFiles(siteDir, { ext: ".mdx" })) {
    const src = readFileSync(abs, "utf-8");
    const body = src.replace(/^---[\s\S]*?\n---\n/, "");
    const ids = [...new Set(renderedMagazineCardIds(body))];
    // slug は「カテゴリ-ディレクトリ名」のフラット形。Convention A（個別ファイル名）と
    // Convention B（article.mdx）が共存するので両方から復元する。
    // basename を使う（Windows の join は円記号区切り＝split("/") では切り出せない・L29 と同じ轍）。
    const rel = abs.slice(siteDir.length + 1).split(sep).join("/");
    const parts = rel.split("/");
    const category = parts[0]!;
    const leaf = basename(rel);
    const name = leaf === "article.mdx" ? parts[parts.length - 2]! : leaf.replace(/\.mdx$/, "");
    out.set(`${category}-${name}`, { body, ids });
  }
  return out;
}

// ── load ──
const metaIndex = JSON.parse(readFileSync(META_INDEX, "utf-8")).docs as Record<
  string,
  any
>;
const bodyCards = indexBodyMagazineCards();

const pageFile = latest("ga4-page-");
if (!pageFile) {
  console.error("ga4-page-*.json が見つかりません。先に npm run fetch-ga4-data -- --dimension page");
  process.exit(1);
}
const pageData = readJsonOrReport(ROOT, pageFile);
const traffic = new Map<string, { users: number; sessions: number }>();
for (const r of pageData.rows) {
  traffic.set(normPath(r.page), {
    users: r.activeUsers ?? 0,
    sessions: r.sessions ?? 0,
  });
}

const clickFile = latest("ga4-cta-clicks-");
const noteClicks = new Map<string, number>();
const affClicks = new Map<string, number>();
let clickData: any = null;
if (clickFile) {
  clickData = readJsonOrReport(ROOT, clickFile);
  for (const r of clickData.rows) {
    const p = normPath(r.page);
    if (r.eventName === "note_cta_click")
      noteClicks.set(p, (noteClicks.get(p) ?? 0) + r.eventCount);
    else if (r.eventName === "affiliate_cta_click")
      affClicks.set(p, (affClicks.get(p) ?? 0) + r.eventCount);
  }
}

// ── 配置別 CTA CTR（DN-0025）──
// impression/click ともに note・アフィリ両方の CTA イベントを合算する（配置は共有される
// 面があるため=article-mid/article-end 等）。(unknown) は internal_nav_click 等 CTA 以外の
// イベントが混ざる placement 値なので対象外にする。
const IMPRESSION_EVENTS = new Set(["note_cta_impression", "affiliate_cta_impression"]);
const CLICK_EVENTS = new Set(["note_cta_click", "affiliate_cta_click"]);
const placementFile = latest("ga4-cta-clicks-by-placement-");
interface PlacementCtr {
  placement: string;
  impressions: number;
  clicks: number;
  ctrPct: number | null;
}
let placementCtr: PlacementCtr[] = [];
let placementMeta: { startDate: string; endDate: string } | null = null;
if (placementFile) {
  const placementData = readJsonOrReport(ROOT, placementFile);
  placementMeta = { startDate: placementData.meta.startDate, endDate: placementData.meta.endDate };
  const agg = new Map<string, { impressions: number; clicks: number }>();
  for (const r of placementData.rows as { placement: string; eventName: string; eventCount: number }[]) {
    if (r.placement === "(unknown)") continue;
    if (!IMPRESSION_EVENTS.has(r.eventName) && !CLICK_EVENTS.has(r.eventName)) continue;
    const cur = agg.get(r.placement) ?? { impressions: 0, clicks: 0 };
    if (IMPRESSION_EVENTS.has(r.eventName)) cur.impressions += r.eventCount;
    else cur.clicks += r.eventCount;
    agg.set(r.placement, cur);
  }
  placementCtr = [...agg.entries()]
    .map(([placement, v]) => ({
      placement,
      impressions: v.impressions,
      clicks: v.clicks,
      ctrPct: v.impressions > 0 ? +((v.clicks / v.impressions) * 100).toFixed(2) : null,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// ── GA4 label × sales.json 突合（DN-0124）──
// note_cta_click の label は `{magazineId}:{utmContent}` 形式のものと、utmContent 単体
// （magazineId が埋め込まれていない＝旧配線やもくじ系）が混在する。前者だけが productId へ
// 解決できる＝「ID付き」。**分母（全クリック）を隠さない**（§9）ため、ID付き/全体の比率を必ず出す。
const labelFile = latest("ga4-cta-clicks-by-label-");
interface NoteLabelSalesRow {
  magazineId: string;
  utmContent: string;
  clicks: number;
  salesCount: number;
  revenue: number;
}
let noteLabelSales: NoteLabelSalesRow[] = [];
let labelSalesWindow: { start: string; end: string } | null = null;
let idClickCoverage: { idClicks: number; totalClicks: number; pct: number | null } = {
  idClicks: 0,
  totalClicks: 0,
  pct: null,
};
if (labelFile) {
  const labelData = readJsonOrReport(ROOT, labelFile);
  labelSalesWindow = { start: labelData.meta.startDate, end: labelData.meta.endDate };
  const salesLog = existsSync(SALES_LOG)
    ? (JSON.parse(readFileSync(SALES_LOG, "utf-8")).sales as { date: string; productId: string; price: number }[])
    : [];
  const salesByProduct = new Map<string, { count: number; revenue: number }>();
  for (const s of salesLog) {
    if (s.date < labelSalesWindow.start || s.date > labelSalesWindow.end) continue;
    const cur = salesByProduct.get(s.productId) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += s.price ?? 0;
    salesByProduct.set(s.productId, cur);
  }
  const byMagazineUtm = new Map<string, { clicks: number; magazineId: string; utmContent: string }>();
  for (const r of labelData.rows as { label: string; eventName: string; eventCount: number }[]) {
    if (r.eventName !== "note_cta_click") continue;
    idClickCoverage.totalClicks += r.eventCount;
    const idx = r.label.indexOf(":");
    if (idx < 0) continue; // ID なし（utmContent 単体）
    idClickCoverage.idClicks += r.eventCount;
    const magazineId = r.label.slice(0, idx);
    const utmContent = r.label.slice(idx + 1);
    const key = `${magazineId}:${utmContent}`;
    const cur = byMagazineUtm.get(key) ?? { clicks: 0, magazineId, utmContent };
    cur.clicks += r.eventCount;
    byMagazineUtm.set(key, cur);
  }
  idClickCoverage.pct = idClickCoverage.totalClicks
    ? +((idClickCoverage.idClicks / idClickCoverage.totalClicks) * 100).toFixed(1)
    : null;
  noteLabelSales = [...byMagazineUtm.values()]
    .map((v) => {
      const s = salesByProduct.get(v.magazineId) ?? { count: 0, revenue: 0 };
      return {
        magazineId: v.magazineId,
        utmContent: v.utmContent,
        clicks: v.clicks,
        salesCount: s.count,
        revenue: s.revenue,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);
}

// ── join: doc ごとに配置を解決し traffic/clicks と突合 ──
interface Row {
  slug: string;
  page: string;
  category: string;
  docGroup: string;
  users: number;
  sessions: number;
  noteCta: string[];
  affiliate: string | null;
  noteClicks: number | null;
  affClicks: number | null;
  monetized: boolean;
  /** どのチャネルも無い（総合判定の穴） */
  gap: boolean;
  /** note 導線が無い。アフィリ枠があると gap は false になるのでこちらで独立して拾う */
  noteGap: boolean;
}

const rows: Row[] = [];
const publishedCategories = new Set(Object.values(NOTE_MAGAZINES).filter((m) => m.published && m.noteUrl).map((m) => m.category));
const zeroPages = JSON.parse(readFileSync(join(ROOT, ".claude/config/magazine-cta-baseline.json"), "utf8")).zeroPage ?? {};
for (const [slug, meta] of Object.entries(metaIndex)) {
  if (meta.published === false || getCategoryBySlug(meta.category)?.visible === false) continue;
  const canonicalPage = getPublicDocPath(slug);
  // 旧URLへの訪問は別行で残し、URL別activeUsersを合算して利用者を二重計上しない。
  const pages = [canonicalPage, ...(traffic.has(`/docs/${slug}`) ? [`/docs/${slug}`] : [])];
  for (const page of pages) {
    const t = traffic.get(page);
    const users = t?.users ?? 0;
    const sessions = t?.sessions ?? 0;

    const docGroup = classifyDoc({ slug, ...meta } as any);
    const placement = resolvePlacement(slug, docGroup as any, isCareerDoc(meta as any));
    const article = bodyCards.get(slug);
    const mid = resolveArticleMidNoteSlot(placement, docGroup, article?.body ?? "", docGroup === 'secondary' && /^civil-construction-[12]$/.test(meta.category));
    const liveInline = mid && getMagazine(mid.magazineId) ? [mid] : [];
    // 冒頭・中央・本文・サイドバーは実描画と同じ resolver で公開商品の有無を判定する。
    const liveTop = placement.top && getMagazine(placement.top.magazineId) ? [placement.top] : [];
    // **もくじタイル（resolveHubCta）も導線に数える**。page.tsx は HUB 資格の記事すべてに
    // 記事末尾＋サイドバーの 2 面で出しており（showMokuji）、placement とは別系統の note 導線。
    // ここを見ていなかったため、HUB 資格の guide が「note 導線ゼロ」に混ざっていた
    // （general-vs-comprehensive 24users / civil-1 guide-grade-comparison 17users）。
    // 非 HUB 資格（技術士一次・concrete・reference）には null が返るので自然に対象外になる。
    const hubTile = !isCareerDoc(meta as any) ? resolveHubCta(meta.category) : null;
    // **MDX 本文の <MagazineCard> も導線に数える**（第 3 の経路・上の indexBodyMagazineCards 参照）。
    const liveBody = article?.ids ?? [];
    const sidebar = sidebarProduct(meta.category, { slug, ...meta } as any);
    // Set は結合した**後**に取る。top/inline だけを先に dedup し liveBody を生のまま足していたため、
    // 同じ magazineId が top/inline と本文カードの両方にあるページで表示が二重化していた
    // （2026-08-25 発覚: civil-2-experience-essay 等が「+」区切りの表示に 2 回出る）。
    const noteCta = [
      ...new Set([
        ...liveTop.map((s) => s.magazineId),
        ...liveInline.map((s) => s.magazineId),
        ...liveBody,
        ...(sidebar ? [sidebar.id] : []),
        ...(hubTile ? [hubTile.trackLabel] : []),
      ]),
    ];
    const affiliate = deriveAffiliate(meta.category, slug);

    // **OR 判定は「どれか 1 つでもあれば合格」なので、アフィリ枠さえあれば note ゼロが隠れる**。
    // 総合判定（monetized）は従来どおり残しつつ、チャネル別の穴を独立して持つ。
    // note は自社商品への唯一の導線で、アフィリ（他社送客）とは代替関係にない。
    //
    // 2026-08-25: 旧 `linksFallback`（PE keyword かつ sidebar に live マガジン無し → /links 送り）を
    // 削除した。page.tsx に /links へのフォールバックは無く（`LinksHubTile` はどこからも import
    // されていない）、**描画されない導線を「あり」と数える偽陽性**だった。sidebar 廃止と同型の
    // ズレで、こちらは note 導線ゼロを隠す向きに効いていた。
    const hasNote = noteCta.length > 0;
    const hasAffiliate = affiliate !== null;
    const monetized = hasNote || hasAffiliate;
    const gap = users >= MIN_USERS && !monetized;
    const noteEligible = publishedCategories.has(meta.category) && !isCareerDoc(meta as any) && !zeroPages[slug];
    const noteGap = users >= MIN_USERS && noteEligible && !hasNote;

    rows.push({
      slug,
      page,
      category: meta.category,
      docGroup,
      users,
      sessions,
      noteCta,
      affiliate,
      noteClicks: clickFile ? noteClicks.get(page) ?? 0 : null,
      affClicks: clickFile ? affClicks.get(page) ?? 0 : null,
      monetized,
      gap,
      noteGap,
    });
  }
}

// 非 doc の高流入ハブ（/ と /category/*）も収益カバレッジに含める。
// これらは docs の placement 系統外（別テンプレ）だが GA4 流入・CTA クリックは取れる。
for (const [page, t] of traffic) {
  if (rows.some((r) => r.page === page)) continue;
  let category: string | null = null;
  let noteCta: string[] = [];
  let affiliate: string | null = null;
  if (page === "/") {
    noteCta = ["home-links-hub"]; // /links 教材ハブ banner（src/app/page.tsx）
    affiliate = null; // 2026-06-25: トップの SAT 講座アフィリ（HOME_AFFILIATE）は廃止。home はアフィリ枠なし。
  } else if (page.startsWith("/category/") || /^\/exam\/[^/]+$/.test(page)) {
    category = page.split('/')[2]!;
    if (!getCategoryBySlug(category) || getCategoryBySlug(category)?.visible === false) continue;
    if (!page.startsWith('/category/') && getCategoryHubPath(category) !== page) continue;
    // 2026-07-06 に resolveCategoryMagazines（複数誌の直リンク）は resolveHubCta へ一本化された。
    // mode:'product' は特定マガジンへの直リンク、mode:'mokuji' は L2 もくじへの集約。
    const hub = resolveHubCta(category);
    noteCta = hub ? [hub.trackLabel] : [];
    // 転職プログラム名（"DXConsulting" / "BuildJob" / "GKS" / "KensetsuJobs"）。trackLabel = "{program}-sidebar"。
    // カテゴリ hub は両方表示（show-both）= 複数になり得るため "+" 連結（例 "KensetsuJobs+BuildJob"）。
    const affs = resolveCategoryCareerAds(category);
    affiliate = affs.length
      ? affs.map((a) => a.trackLabel.replace(/-sidebar$/, "")).join("+")
      : null;
  } else {
    continue;
  }
  const users = t.users;
  const monetized = noteCta.length > 0 || affiliate !== null;
  rows.push({
    slug: page,
    page,
    category: category ?? "(home)",
    docGroup: "hub",
    users,
    sessions: t.sessions,
    noteCta,
    affiliate,
    noteClicks: clickFile ? noteClicks.get(page) ?? 0 : null,
    affClicks: clickFile ? affClicks.get(page) ?? 0 : null,
    monetized,
    gap: users >= MIN_USERS && !monetized,
    noteGap: users >= MIN_USERS && publishedCategories.has(category ?? '') && noteCta.length === 0,
  });
}

rows.sort((a, b) => b.users - a.users);

// ── render markdown ──
const trafficked = rows.filter((r) => r.users > 0);
const gaps = trafficked.filter((r) => r.gap);
// アフィリ枠があるので総合判定は通るが、note 導線が無いページ（OR 判定が隠していた穴）
const noteOnlyGaps = trafficked.filter((r) => r.noteGap && !r.gap);
const matchedPages = new Set(rows.map((r) => r.page));
const coverage = {
  trafficRows: traffic.size,
  matchedTrafficRows: [...traffic.keys()].filter((page) => matchedPages.has(page)).length,
  unmatchedTrafficPages: [...traffic.keys()].filter((page) => !matchedPages.has(page)),
};
if (coverage.trafficRows === 0 || coverage.matchedTrafficRows === 0) {
  throw new Error(`収益導線の集計不成立: GA4入力 ${coverage.trafficRows} URL / 照合 ${coverage.matchedTrafficRows} URL`);
}
const ctr = (clicks: number | null, users: number) =>
  clicks === null ? "n.d." : users > 0 ? `${((clicks / users) * 100).toFixed(1)}%` : "—";
const noteLabel = (r: Row) => (r.noteCta.length ? r.noteCta.join("+") : "—");

const lines: string[] = [];
lines.push("## 収益カバレッジ ダッシュボード");
lines.push("");
lines.push(`- GA4入力 ${coverage.trafficRows} URL / 記事・資格トップ・ホームへの照合 ${coverage.matchedTrafficRows} URL / その集計対象外 ${coverage.unmatchedTrafficPages.length} URL（ツール・検索・教材一覧等を含む）`);
lines.push("");
lines.push(
  `> 流入: \`${pageData.meta.startDate}〜${pageData.meta.endDate}\`（${basename(pageFile)}）` +
    (clickFile
      ? ` / クリック: \`${clickData.meta.startDate}〜${clickData.meta.endDate}\``
      : " / クリック: **未取得**（計装直後はデータ無しが正常）"),
);
lines.push("");
lines.push(
  `- 流入のあるページ: **${trafficked.length}**　/　高流入(≥${MIN_USERS}users)で**収益導線ゼロ**: **${gaps.length}**` +
    `　/　**note 導線ゼロ**（アフィリのみ）: **${noteOnlyGaps.length}**`,
);
lines.push("");

if (gaps.length) {
  lines.push(`### 要対応ギャップ（高流入 × 無導線）`);
  lines.push("");
  lines.push("| ページ | users | category | group |");
  lines.push("|---|--:|---|---|");
  for (const r of gaps)
    lines.push(`| \`${r.slug}\` | ${r.users} | ${r.category} | ${r.docGroup} |`);
  lines.push("");
} else {
  lines.push("### 要対応ギャップ（高流入 × 無導線）");
  lines.push("");
  lines.push(`- なし（≥${MIN_USERS}users のページはすべて何らかの収益導線あり）`);
  lines.push("");
}

if (noteOnlyGaps.length) {
  // OR 判定が隠していた穴。アフィリ枠はあるので「導線あり」と数えられていたが、
  // 自社商品（note）への導線はゼロ。アフィリは他社送客なので note の代替にならない。
  lines.push(`### note 導線ゼロ（アフィリ枠のみで合格扱いだったページ）`);
  lines.push("");
  lines.push("| ページ | users | category | group | affiliate |");
  lines.push("|---|--:|---|---|---|");
  for (const r of noteOnlyGaps) {
    lines.push(`| \`${r.slug}\` | ${r.users} | ${r.category} | ${r.docGroup} | ${r.affiliate ?? "—"} |`);
  }
  lines.push("");
}

lines.push("### 上位 25 ページ × 収益カバレッジ");
lines.push("");
lines.push("| # | ページ | users | note CTA | アフィリ | noteCTR | affCTR |");
lines.push("|--:|---|--:|---|---|--:|--:|");
trafficked.slice(0, 25).forEach((r, i) => {
  lines.push(
    `| ${i + 1} | \`${r.slug}\` | ${r.users} | ${noteLabel(r)} | ${r.affiliate ?? "—"} | ${ctr(r.noteClicks, r.users)} | ${ctr(r.affClicks, r.users)} |`,
  );
});
lines.push("");
lines.push(
  `> note CTA: 配置済み live マガジン id（\`(/links)\`=教材ハブ送り）。アフィリ: 転職creativeの導出（SoT=DocPage.tsx）。CTR は users 比、\`n.d.\`=クリック未取得。`,
);
lines.push("");

// ── 配置別 CTA CTR（DN-0025）──
lines.push("### 配置別 CTA CTR");
lines.push("");
if (placementCtr.length) {
  lines.push(
    `> 期間: \`${placementMeta!.startDate}〜${placementMeta!.endDate}\`（${basename(placementFile!)}）。impression/click は note・アフィリ両 CTA の合算。`,
  );
  lines.push("");
  lines.push("| placement | impressions | clicks | CTR% |");
  lines.push("|---|--:|--:|--:|");
  for (const p of placementCtr) {
    lines.push(`| ${p.placement} | ${p.impressions} | ${p.clicks} | ${p.ctrPct === null ? "—" : `${p.ctrPct}%`} |`);
  }
  lines.push("");
} else {
  lines.push("- 未取得（`ga4-cta-clicks-by-placement-*.json` が無い）");
  lines.push("");
}

// ── GA4 label × sales.json 突合（DN-0124）──
lines.push("### note CTA label × 同期間の商品売上（ID付きのみ）");
if (labelSalesWindow) lines.push(`> 期間: ${labelSalesWindow.start}〜${labelSalesWindow.end}。売上は全流入経路の商品合計で、CTA別購入の帰属ではない。同じ商品の複数ラベルに同じ合計を表示するため、行の売上を合算しない。`);
lines.push("");
lines.push(
  `> ID付きクリック / 全クリック: **${idClickCoverage.idClicks} / ${idClickCoverage.totalClicks}**` +
    `（${idClickCoverage.pct === null ? "n.d." : `${idClickCoverage.pct}%`}）。残りは utmContent 単体で magazineId 未解決のため売上突合の対象外。`,
);
lines.push("");
if (noteLabelSales.length) {
  lines.push("| magazineId | utmContent | clicks | 売上件数 | 売上額(円) |");
  lines.push("|---|---|--:|--:|--:|");
  for (const r of noteLabelSales) {
    lines.push(`| ${r.magazineId} | ${r.utmContent} | ${r.clicks} | ${r.salesCount} | ${r.revenue.toLocaleString("ja-JP")} |`);
  }
  lines.push("");
} else {
  lines.push("- 未取得（`ga4-cta-clicks-by-label-*.json` が無い、または ID付きラベルが0件）");
  lines.push("");
}

const md = lines.join("\n");
const report = {
  schemaVersion: 1,
  meta: {
    trafficWindow: { start: pageData.meta.startDate, end: pageData.meta.endDate },
    clickWindow: clickData ? { start: clickData.meta.startDate, end: clickData.meta.endDate } : null,
    labelSalesWindow,
    minUsers: MIN_USERS,
    pageFile: basename(pageFile),
    clickFile: clickFile ? basename(clickFile) : null,
  },
  summary: { trafficked: trafficked.length, gaps: gaps.length },
  coverage,
  rows,
  placementCtr,
  noteLabelSales,
  idClickCoverage,
};
const jsonOutput = process.argv.includes("--json");
console.log(jsonOutput ? JSON.stringify(report, null, 2) : md);

// --check / --json は書き込まない。入力・URL照合ゼロは上で集計不成立として落とす。
if (process.argv.includes("--check") || jsonOutput) {
  console.error(`[monetization-coverage] OK: 入力 ${coverage.trafficRows} URL / 照合 ${coverage.matchedTrafficRows} URL / 流入 ${trafficked.length} ページ / ギャップ ${gaps.length} 件（未書き込み）`);
} else {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  writeFileSync(join(OUT_DIR, `coverage-${stamp}.json`), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(ROOT, datasetPath("analysis.monetization-report")), md + "\n");
  console.error(`\n[written] ${datasetPath("analysis.monetization-report")}`);
}
