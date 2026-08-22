/**
 * SVG ギャラリー — サイト/note 図版を1枚の HTML で一覧確認する目視 QA ツール（site/note タブ＋資格別フィルタ）。
 *
 * SVG デザインの共有化・一貫性チェック用。色トークン逸脱・フォント過小・
 * 矢印 marker のばらつき・レイアウト崩れをまとめてブラウザで確認できる。
 * 機械監査結果（.claude/state/svg-audit.json）があれば重大度バッジ付きで表示する。
 *
 * 既存ツールとの棲み分け:
 *   - scripts/ogp-gallery.mjs                      … OGP PNG 一覧（HTML パターンの流用元）
 *   - check-mdx/.../svg/build-gallery-comment.mjs  … 同じ SVG を Markdown 化（PR コメント用）
 *   - 本スクリプト                                 … ローカル HTML 目視用
 *
 * UI: 上部タブで「サイト（content/site/**\/img/*.svg）」と「note（content/note/**\/img/figure-*.png）」を
 *     切替え、各タブ内で資格別（カテゴリ）に絞り込み。site タブは severity フィルタも併設。
 *
 * Usage:
 *   node scripts/svg-gallery.mjs            → .tmp/svg-gallery.html を生成（site/note 両方をタブで）
 *   node scripts/svg-gallery.mjs --open     → 生成して既定ブラウザで開く（Windows）
 *   （--all は後方互換で受理。note は常にタブ表示されるため指定不要）
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { NOTE_CONTENT_ROOT } from "./lib/repository-paths.mjs";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = process.cwd();
const POSTS = SITE_CONTENT_ROOT;
const NOTE = NOTE_CONTENT_ROOT;
const AUDIT_STATE = join(ROOT, ".claude", "state", "svg-audit.json");
const CATALOG_STATE = join(ROOT, ".claude", "state", "svg-catalog.json");
const OUT = join(ROOT, ".tmp", "svg-gallery.html");

// --- カタログ（あれば）から file -> {canvas,fitStatus} を集約（キャンバス適合バッジ用） ---
const fitByFile = {};
if (existsSync(CATALOG_STATE)) {
  try {
    const cat = JSON.parse(readFileSync(CATALOG_STATE, "utf8"));
    for (const e of cat.entries || []) {
      if (e.fitStatus && e.fitStatus !== "n/a") fitByFile[e.file] = { canvas: e.canvas, fitStatus: e.fitStatus };
    }
  } catch { /* バッジ無しで継続 */ }
}
function fitOf(rel) {
  // rel は "content/site/..." 形（svg-catalog.json の e.file と同形）
  const f = fitByFile[rel];
  if (!f) return null; // figure-*.svg 以外 = 標準対象外
  if (f.fitStatus === "conforming") return { cls: "fit-ok", label: `${f.canvas} ✓` };
  return { cls: "fit-ng", label: `要再作図(${f.canvas})` };
}

// note は常にタブで表示する（--all は後方互換で受理する no-op フラグ）

// --- 機械監査結果（あれば）を file -> severity に集約 ---
const fileSeverity = {};
let hasAudit = false;
if (existsSync(AUDIT_STATE)) {
  try {
    const audit = JSON.parse(readFileSync(AUDIT_STATE, "utf8"));
    for (const f of audit.findings || []) {
      const path = String(f.file).replace(/\\/g, "/");
      if (!fileSeverity[path]) fileSeverity[path] = { HIGH: 0, MEDIUM: 0, LOW: 0, patterns: new Set() };
      if (f.severity && fileSeverity[path][f.severity] !== undefined) fileSeverity[path][f.severity]++;
      if (f.pattern) fileSeverity[path].patterns.add(f.pattern);
    }
    hasAudit = true;
  } catch {
    console.error(`[svg-gallery] svg-audit.json の読込に失敗。バッジ無しで継続`);
  }
}

function sevOf(rel) {
  // rel は "content/site/..." 形（svg-audit.json の f.file と同形）
  // 4 段階は build-gallery-comment.mjs と整合: clean ✅ / low 🟢 / medium 🟡 / high 🔴
  const s = fileSeverity[rel];
  if (!s) return { key: "clean", icon: "&#9989;", badge: "audit クリア", patterns: "" };
  const pat = [...s.patterns].sort().join(", ");
  const parts = [];
  if (s.HIGH > 0) parts.push(`HIGH ${s.HIGH}`);
  if (s.MEDIUM > 0) parts.push(`MEDIUM ${s.MEDIUM}`);
  if (s.LOW > 0) parts.push(`LOW ${s.LOW}`);
  const badge = parts.join(" / ") || "audit クリア";
  if (s.HIGH > 0) return { key: "high", icon: "&#128308;", badge, patterns: pat };
  if (s.MEDIUM > 0) return { key: "medium", icon: "&#128993;", badge, patterns: pat };
  if (s.LOW > 0) return { key: "low", icon: "&#128994;", badge, patterns: pat };
  return { key: "clean", icon: "&#9989;", badge: "audit クリア", patterns: pat };
}

function fileUrl(full) {
  return "file:///" + encodeURI(full.replace(/\\/g, "/"));
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 過去問クロップディレクトリ（P1-P8 対象外・PDF忠実度は別エージェント）
const EXAM_DIR_RE = /\/(h\d+-primary|primary-h\d+[^/]*)\//;

// --- site SVG を収集 ---
function collectSite() {
  if (!existsSync(POSTS)) return [];
  const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/img\/[^/]+\.svg$/.test(p));
  return rels
    .map((rel) => {
      const slugDir = dirname(rel); // e.g. category/slug/img
      const parts = slugDir.split("/");
      const category = parts[0];
      const slug = parts.slice(0, 2).join("/");
      const full = join(POSTS, rel).replace(/\\/g, "/");
      const auditKey = "content/site/" + rel;
      const name = rel.split("/").pop();
      const kind = EXAM_DIR_RE.test("/" + rel) ? "exam" : "content";
      return { rel, category, slug, full, name, kind, sev: sevOf(auditKey), fit: fitOf(auditKey) };
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "content" ? -1 : 1; // content 先
      const order = { high: 0, medium: 1, low: 2, clean: 3 };
      if (order[a.sev.key] !== order[b.sev.key]) return order[a.sev.key] - order[b.sev.key];
      return a.rel.localeCompare(b.rel);
    });
}

// --- note 図版 PNG を収集（--all） ---
function collectNote() {
  if (!existsSync(NOTE)) return [];
  const rels = readdirSync(NOTE, { recursive: true, withFileTypes: false })
    .map((p) => String(p).replace(/\\/g, "/"))
    .filter((p) => /\/img\/figure-[^/]+\.png$/.test(p));
  return rels
    .map((rel) => {
      const slugDir = dirname(rel);
      const parts = slugDir.split("/");
      const category = parts[0];
      const slug = parts.slice(0, -1).join("/");
      const full = join(NOTE, rel).replace(/\\/g, "/");
      const name = rel.split("/").pop();
      return { rel, category, slug, full, name };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

function cardSite(o) {
  const fit = o.fit ? `<span class="fit ${o.fit.cls}">${esc(o.fit.label)}</span>` : "";
  const fitAttr = o.fit ? o.fit.cls.replace("fit-", "") : "na";
  if (o.kind === "exam") {
    return `  <figure class="card" data-cat="${esc(o.category)}" data-sev="clean" data-fit="${fitAttr}" data-kind="exam">
    <img loading="lazy" src="${fileUrl(o.full)}" alt="${esc(o.slug)}">
    <figcaption><span class="exam-tag">試験原図</span> ${esc(o.slug + "/" + o.name)} ${fit}<br><span class="badge">PDF忠実度監査対象（P1-P8対象外）</span></figcaption>
  </figure>`;
  }
  const p = o.sev.patterns ? `<div class="pat">${esc(o.sev.patterns)}</div>` : "";
  return `  <figure class="card" data-cat="${esc(o.category)}" data-sev="${o.sev.key}" data-fit="${fitAttr}" data-kind="content">
    <img loading="lazy" src="${fileUrl(o.full)}" alt="${esc(o.slug)}">
    <figcaption><span class="sev">${o.sev.icon}</span> ${esc(o.slug + "/" + o.name)} ${fit}<br><span class="badge">${esc(o.sev.badge)}</span>${p}</figcaption>
  </figure>`;
}

function cardNote(o) {
  return `  <figure class="card" data-cat="${esc(o.category)}" data-sev="clean">
    <img loading="lazy" src="${fileUrl(o.full)}" alt="${esc(o.slug)}">
    <figcaption>${esc(o.slug + "/" + o.name)}</figcaption>
  </figure>`;
}

const site = collectSite();
const note = collectNote();
const siteCats = [...new Set(site.map((i) => i.category))].sort();
const noteCats = [...new Set(note.map((i) => i.category))].sort();
const siteContentCount = site.filter((i) => i.kind === "content").length;
const siteExamCount = site.filter((i) => i.kind === "exam").length;

const sevButtons = hasAudit
  ? `<span class="sep">severity:</span>
    <button onclick="fs('')">全</button>
    <button onclick="fs('high')">&#128308; HIGH</button>
    <button onclick="fs('medium')">&#128993; MEDIUM</button>
    <button onclick="fs('low')">&#128994; LOW</button>
    <button onclick="fs('clean')">&#9989; clean</button>`
  : "";

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>SVG Gallery (site ${site.length} / note ${note.length})</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f5;color:#222}
  header{position:sticky;top:0;z-index:9;background:#fff;padding:8px 16px 0;border-bottom:1px solid #ddd}
  .tabs{display:flex;gap:8px;margin-bottom:8px}
  .tab{font-size:13px;font-weight:bold;padding:6px 18px;border:1px solid #ccc;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;background:#f4f4f5;cursor:pointer}
  .tab.active{background:#fff;border-color:#2e6da4;border-bottom-color:#2e6da4;color:#2e6da4}
  .filterbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-bottom:8px}
  .sep{color:#888;margin:0 2px 0 8px;font-size:12px;font-weight:bold}
  button{font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fff;cursor:pointer}
  button:hover{border-color:#2e6da4;color:#2e6da4}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:16px}
  .card{margin:0;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
  .card img{width:100%;display:block;background:#fff;padding:8px;box-sizing:border-box}
  figcaption{font-size:11px;color:#555;padding:6px 8px;word-break:break-all;border-top:1px solid #f0f0f0}
  .sev{font-size:12px}
  .badge{color:#8a8a8a}
  .pat{color:#b22234;margin-top:2px}
  .fit{font-size:10px;padding:1px 6px;border-radius:999px;font-weight:700}
  .fit-ok{background:#e6f4ea;color:#1a7f37}
  .fit-ng{background:#fde8e8;color:#b22234}
  .exam-tag{font-size:10px;padding:1px 6px;border-radius:999px;font-weight:700;background:#f0e6ff;color:#6a0dad}
</style></head>
<body>
<header>
  <div class="tabs">
    <button class="tab active" data-tab="site" onclick="setTab('site')">サイト（${site.length}）</button>
    <button class="tab" data-tab="note" onclick="setTab('note')">note（${note.length}）</button>
  </div>
  <div class="filterbar" id="bar-site">
    <span class="sep">種別:</span>
    <button onclick="fk('')">全（${site.length}）</button>
    <button onclick="fk('content')">コンテンツ図版（${siteContentCount}）</button>
    <button onclick="fk('exam')">過去問クロップ（${siteExamCount}）</button>
    <span class="sep">資格:</span><button onclick="fc('site','')">全</button>
    ${siteCats.map((c) => `<button onclick="fc('site','${esc(c)}')">${esc(c)}</button>`).join("\n    ")}
    ${sevButtons}
    <span class="sep">canvas:</span>
    <button onclick="ff('')">全</button>
    <button onclick="ff('ng')">要再作図</button>
    <button onclick="ff('ok')">適合</button>
  </div>
  <div class="filterbar" id="bar-note" style="display:none">
    <span class="sep">資格:</span><button onclick="fc('note','')">全</button>
    ${noteCats.map((c) => `<button onclick="fc('note','${esc(c)}')">${esc(c)}</button>`).join("\n    ")}
  </div>
</header>
<section id="sec-site">
<div class="grid">
${site.map(cardSite).join("\n")}
</div>
</section>
<section id="sec-note" style="display:none">
<div class="grid">
${note.map(cardNote).join("\n")}
</div>
</section>
<script>
var cF={site:'',note:''}, sF='', fF='', kF='';
function applyCat(src){
  var cf=cF[src];
  document.querySelectorAll('#sec-'+src+' .card').forEach(function(el){
    var okc=(!cf||el.dataset.cat===cf);
    var oks=(src!=='site'||!sF||el.dataset.sev===sF);
    var okf=(src!=='site'||!fF||el.dataset.fit===fF);
    var okk=(src!=='site'||!kF||el.dataset.kind===kF);
    el.style.display=(okc&&oks&&okf&&okk)?'':'none';
  });
}
function ff(f){fF=f;applyCat('site');}
function fk(k){kF=k;applyCat('site');}
function setTab(t){
  document.getElementById('sec-site').style.display=(t==='site')?'':'none';
  document.getElementById('sec-note').style.display=(t==='note')?'':'none';
  document.getElementById('bar-site').style.display=(t==='site')?'':'none';
  document.getElementById('bar-note').style.display=(t==='note')?'':'none';
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('active',b.dataset.tab===t);});
}
function fc(src,c){cF[src]=c;applyCat(src);}
function fs(s){sF=s;applyCat('site');}
</script>
</body></html>`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`[svg-gallery] site ${site.length} 枚（${siteCats.length} 資格）/ note ${note.length} 枚（${noteCats.length} 資格）${hasAudit ? " (audit バッジ付き)" : " (audit 無し)"} → ${OUT}`);

if (process.argv.includes("--open")) {
  try {
    execFileSync("cmd", ["/c", "start", "", OUT.replace(/\//g, "\\")], { stdio: "ignore" });
    console.log("[svg-gallery] 既定ブラウザで開きました");
  } catch {
    console.log("[svg-gallery] 自動オープン不可。手動で開いてください:", OUT);
  }
}
