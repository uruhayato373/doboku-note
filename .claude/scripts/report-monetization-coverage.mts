/**
 * 収益カバレッジ ダッシュボード（オフライン・週次レビュー統合用）
 *
 * GA4 のページ別流入 × CTA クリック × 実際の CTA 配置（note 有料マガジン /
 * アフィリエイト）を突合し、「高流入なのに収益導線が無い/弱い」ページを自動検出する。
 * 2026-06-06 の手作業監査（last-minute-2026 の無導線発見）を機械化したもの。
 *
 * データソース:
 *   - .claude/state/metrics/ga4/ga4-page-*.json        … ページ別流入（最新を自動選択）
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-*.json   … CTA クリック（あれば。無ければ n.d.）
 *   - src/config/doc-meta-index.json                    … 全 doc の category/group/tags
 *
 * 配置の真実源:
 *   - note CTA: src/lib/magazine-placement.ts（resolvePlacement）+ note-magazines.ts（公開判定）
 *     ＋ src/lib/hub-cta.ts（もくじタイル）＋ MDX 本文の <MagazineCard>
 *   - アフィリ: src/app/docs/[...slug]/page.tsx のサイドバー条件をミラー（下記 deriveAffiliate）
 *
 * **数える経路は「実際に描画されるもの」に揃える**（2026-08-25・DN-0133）。
 * 描画と集計がずれると、偽陰性は「配線済みの面を毎週 Must に出し続ける」（top・もくじタイル・
 * 本文カード）、偽陽性は「導線ゼロを隠す」（sidebar・/links フォールバック）形で効く。
 * どちらもレビューの意思決定を静かに歪めるので、page.tsx が読まない経路をここで数えない。
 *
 * 使い方:
 *   npx tsx .claude/scripts/report-monetization-coverage.mts
 *   npx tsx .claude/scripts/report-monetization-coverage.mts --min-users 20
 *   （出力: コンソール md + .claude/state/metrics/monetization/coverage-*.json + coverage-latest.md）
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "fs";
// basename を使う: Windows では join() が円記号区切りを返すため split("/") ではファイル名を
// 切り出せず、生成物に絶対パスがそのまま焼き込まれて commit される（2026-08-18 修正）。
// check-note-site-utm が Windows で常に 0 件になった事故（2026-07-28）と同型。
import { basename, join, sep } from "path";
import { classifyDoc, isCareerDoc } from "../../src/lib/doc-classifier.ts";
import { resolvePlacement } from "../../src/lib/magazine-placement.ts";
import { resolveHubCta } from "../../src/lib/hub-cta.ts";
import { getMagazine } from "../../src/lib/note-magazines.ts";
import {
  resolveCategoryCareerAds,
  resolveDocsCareerSidebarAd,
} from "../../src/config/affiliate-creatives.ts";

const ROOT = process.cwd();
const GA4_DIR = join(ROOT, ".claude/state/metrics/ga4");
const OUT_DIR = join(ROOT, ".claude/state/metrics/monetization");
const META_INDEX = join(ROOT, "src/config/doc-meta-index.json");
const SALES_LOG = join(ROOT, ".claude/state/sales/sales-log.json");

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : fallback;
}
const MIN_USERS = arg("--min-users", 15); // gap 判定の高流入しきい値

function latest(prefix: string): string | null {
  if (!existsSync(GA4_DIR)) return null;
  const files = readdirSync(GA4_DIR)
    // prefix の直後が数字（日付）のものだけ＝`ga4-cta-clicks-by-device-*` / `-by-label-*` の別スキーマ
    // ファイルを誤って拾わない（"b">"2" で sort 末尾に来て latest を乗っ取り TypeError になっていた）。
    .filter((f) => f.startsWith(prefix) && /^\d/.test(f.slice(prefix.length)) && f.endsWith(".json"))
    .sort();
  return files.length ? join(GA4_DIR, files[files.length - 1]) : null;
}

function normPath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

// ── アフィリエイト サイドバー配置の導出（page.tsx のミラー。SoT は page.tsx） ──
// 全 docs サイドバー上部に転職枠を無条件常設。creative はカテゴリ別出し分け
// （resolveDocsCareerSidebarAd: 総監=PE_CONSULTING〔DXConsulting〕/ 他=〜2026-08-31 BuildJob・
// 9-01 以降 GKS）。2026-06-25: 講座（SAT）併置は廃止＝現行アフィリは転職のみ。docs は全て転職枠が出る。
function deriveAffiliate(category: string): string | null {
  // サイドバー転職枠のプログラム名（"BuildJob" / "GKS" / "DXConsulting"）。trackLabel = "{program}-sidebar"。
  return resolveDocsCareerSidebarAd(category).trackLabel.replace(/-sidebar$/, "");
}

// ── 本文に直接置かれた <MagazineCard>（MDX 内・placement を経由しない note 導線） ──
// placement（top/inline）と もくじタイルに加えて、**MDX 本文へ直に書かれたカード**が第 3 の
// 経路として存在する。2026-08-25 まで数えておらず、12 本を「note 導線ゼロ」と誤って扱っていた
// （例: pe-construction の学習法系 7 本は本文カードだけで送客している）。
// 実測の起点は management-tradeoffs — sidebar 廃止（DN-0133）で placement が空になるが、
// 本文には <MagazineCard> が 3 枚あって導線は生きている。
function indexBodyMagazineCards(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const walk = (dir: string, acc: string[] = []): string[] => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (e.name.endsWith(".mdx")) acc.push(p);
    }
    return acc;
  };
  const siteDir = join(ROOT, "content/site");
  if (!existsSync(siteDir)) return out;
  for (const abs of walk(siteDir)) {
    const src = readFileSync(abs, "utf-8");
    const ids = [
      ...new Set(
        [...src.matchAll(/<MagazineCard\s+[^>]*id="([^"]+)"/g)].map((m) => m[1]!),
      ),
    ];
    if (!ids.length) continue;
    // slug は「カテゴリ-ディレクトリ名」のフラット形。Convention A（個別ファイル名）と
    // Convention B（article.mdx）が共存するので両方から復元する。
    // basename を使う（Windows の join は円記号区切り＝split("/") では切り出せない・L29 と同じ轍）。
    const rel = abs.slice(siteDir.length + 1).split(sep).join("/");
    const parts = rel.split("/");
    const category = parts[0]!;
    const leaf = basename(rel);
    const name = leaf === "article.mdx" ? parts[parts.length - 2]! : leaf.replace(/\.mdx$/, "");
    out.set(`${category}-${name}`, ids);
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
const pageData = JSON.parse(readFileSync(pageFile, "utf-8"));
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
  clickData = JSON.parse(readFileSync(clickFile, "utf-8"));
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
  const placementData = JSON.parse(readFileSync(placementFile, "utf-8"));
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

// ── GA4 label × sales-log 突合（DN-0124）──
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
let idClickCoverage: { idClicks: number; totalClicks: number; pct: number | null } = {
  idClicks: 0,
  totalClicks: 0,
  pct: null,
};
if (labelFile) {
  const labelData = JSON.parse(readFileSync(labelFile, "utf-8"));
  const salesLog = existsSync(SALES_LOG)
    ? (JSON.parse(readFileSync(SALES_LOG, "utf-8")).sales as { productId: string; price: number }[])
    : [];
  const salesByProduct = new Map<string, { count: number; revenue: number }>();
  for (const s of salesLog) {
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
for (const [slug, meta] of Object.entries(metaIndex)) {
  if (meta.published === false) continue;
  const page = `/docs/${slug}`;
  const t = traffic.get(page);
  const users = t?.users ?? 0;
  const sessions = t?.sessions ?? 0;

  const docGroup = classifyDoc({ slug, ...meta } as any);
  const placement = resolvePlacement(slug, docGroup as any);
  const liveInline = placement.inline.filter((s) => getMagazine(s.magazineId));
  // **top（冒頭 1 行 CTA）も導線に数える**。2026-08-25 まで inline+sidebar しか見ておらず、
  // top だけで配線したページが「note 導線ゼロ」に出続けていた。pastExam は MidCta の
  // midEligibleGroup に入らないため inline を足しても描画されず、`top` が唯一の置き場になる
  // （magazine-placement.ts 4.2 の説明どおり）。そこを数えないと、正しく配線した面ほど
  // 未配線に見える。実害: r08-primary(104users) と competency-revision-r8(39users) は
  // W33 に配線済みなのに W33・W34・W35 と 3 週続けて「未配線」として Must に挙がっていた。
  const liveTop = placement.top && getMagazine(placement.top.magazineId) ? [placement.top] : [];
  // **もくじタイル（resolveHubCta）も導線に数える**。page.tsx は HUB 資格の記事すべてに
  // 記事末尾＋サイドバーの 2 面で出しており（showMokuji）、placement とは別系統の note 導線。
  // ここを見ていなかったため、HUB 資格の guide が「note 導線ゼロ」に混ざっていた
  // （general-vs-comprehensive 24users / civil-1 guide-grade-comparison 17users）。
  // 非 HUB 資格（技術士一次・concrete・reference）には null が返るので自然に対象外になる。
  const hubTile = !isCareerDoc(meta as any) ? resolveHubCta(meta.category) : null;
  // **MDX 本文の <MagazineCard> も導線に数える**（第 3 の経路・上の indexBodyMagazineCards 参照）。
  const liveBody = (bodyCards.get(slug) ?? []).filter((id) => getMagazine(id as any));
  const noteCta = [
    ...new Set([...liveTop, ...liveInline].map((s) => s.magazineId)),
    ...liveBody,
    ...(hubTile ? [hubTile.trackLabel] : []),
  ];
  const affiliate = deriveAffiliate(meta.category);

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
  const noteGap = users >= MIN_USERS && !hasNote;

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

// 非 doc の高流入ハブ（/ と /category/*）も収益カバレッジに含める。
// これらは docs の placement 系統外（別テンプレ）だが GA4 流入・CTA クリックは取れる。
for (const [page, t] of traffic) {
  let category: string | null = null;
  let noteCta: string[] = [];
  let affiliate: string | null = null;
  if (page === "/") {
    noteCta = ["home-links-hub"]; // /links 教材ハブ banner（src/app/page.tsx）
    affiliate = null; // 2026-06-25: トップの SAT 講座アフィリ（HOME_AFFILIATE）は廃止。home はアフィリ枠なし。
  } else if (page.startsWith("/category/")) {
    category = page.slice("/category/".length);
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
    noteGap: users >= MIN_USERS && noteCta.length === 0,
  });
}

rows.sort((a, b) => b.users - a.users);

// ── render markdown ──
const trafficked = rows.filter((r) => r.users > 0);
const gaps = trafficked.filter((r) => r.gap);
// アフィリ枠があるので総合判定は通るが、note 導線が無いページ（OR 判定が隠していた穴）
const noteOnlyGaps = trafficked.filter((r) => r.noteGap && !r.gap);
const ctr = (clicks: number | null, users: number) =>
  clicks === null ? "n.d." : users > 0 ? `${((clicks / users) * 100).toFixed(1)}%` : "—";
const noteLabel = (r: Row) => (r.noteCta.length ? r.noteCta.join("+") : "—");

const lines: string[] = [];
lines.push("## 収益カバレッジ ダッシュボード");
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
  `> note CTA: 配置済み live マガジン id（\`(/links)\`=教材ハブ送り）。アフィリ: サイドバー枠の導出（SoT=page.tsx）。CTR は users 比、\`n.d.\`=クリック未取得。`,
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

// ── GA4 label × sales-log 突合（DN-0124）──
lines.push("### note CTA label × 売上 突合（ID付きのみ）");
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
console.log(md);

// ── persist ──
// --check: ここまでの計算（入力の読み込み・配置解決・集計）が完走したことだけを確認し、
// 成果物は書かない。quality-audit のゲートから毎回呼ぶため、実行のたびに timestamped JSON を
// 増やさない。なぜゲート化したか: 2026-07-06 に magazine-placement.ts から
// resolveCategoryMagazines が消えた際、本スクリプトは import エラーで実行不能になったのに
// 検出器が無く、週次レビューは 6 週間ぶん古い（6/18 時点の）集計を貼り続けた。
// 「壊れているのに誰も気づかない」を機械で塞ぐ（2026-08-16 追加）。
if (process.argv.includes("--check")) {
  console.log(
    `[monetization-coverage] OK: 流入 ${trafficked.length} ページ / ギャップ ${gaps.length} 件を算出（--check・未書き込み）`,
  );
  process.exit(0);
}
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
writeFileSync(
  join(OUT_DIR, `coverage-${stamp}.json`),
  JSON.stringify(
    {
      meta: {
        trafficWindow: { start: pageData.meta.startDate, end: pageData.meta.endDate },
        clickWindow: clickData
          ? { start: clickData.meta.startDate, end: clickData.meta.endDate }
          : null,
        minUsers: MIN_USERS,
        pageFile: basename(pageFile),
        clickFile: clickFile ? basename(clickFile) : null,
      },
      summary: { trafficked: trafficked.length, gaps: gaps.length },
      rows,
      placementCtr,
      noteLabelSales,
      idClickCoverage,
    },
    null,
    2,
  ),
);
writeFileSync(join(OUT_DIR, "coverage-latest.md"), md + "\n");
console.error(`\n[written] ${join(OUT_DIR, "coverage-latest.md")}`);
