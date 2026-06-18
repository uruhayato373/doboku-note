/**
 * SVG ギャラリー — サイト図版 SVG を1枚の HTML で一覧確認する目視 QA ツール。
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
 * Usage:
 *   node scripts/svg-gallery.mjs            → .tmp/svg-gallery.html を生成（site SVG）
 *   node scripts/svg-gallery.mjs --open     → 生成して既定ブラウザで開く（Windows）
 *   node scripts/svg-gallery.mjs --all      → note 図版（docs/note/**\/img/figure-*.png）も第2セクションに追加
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const POSTS = join(ROOT, ".local", "r2", "posts");
const NOTE = join(ROOT, "docs", "note");
const AUDIT_STATE = join(ROOT, ".claude", "state", "svg-audit.json");
const OUT = join(ROOT, ".tmp", "svg-gallery.html");

const WITH_NOTE = process.argv.includes("--all");

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
  // rel は ".local/r2/posts/..." 形（svg-audit.json の f.file と同形）
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
      const auditKey = ".local/r2/posts/" + rel; // svg-audit.json の f.file と突合
      const name = rel.split("/").pop();
      return { rel, category, slug, full, name, sev: sevOf(auditKey) };
    })
    .sort((a, b) => {
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
  const p = o.sev.patterns ? `<div class="pat">${esc(o.sev.patterns)}</div>` : "";
  return `  <figure class="card" data-cat="${esc(o.category)}" data-sev="${o.sev.key}">
    <img loading="lazy" src="${fileUrl(o.full)}" alt="${esc(o.slug)}">
    <figcaption><span class="sev">${o.sev.icon}</span> ${esc(o.slug + "/" + o.name)}<br><span class="badge">${esc(o.sev.badge)}</span>${p}</figcaption>
  </figure>`;
}

function cardNote(o) {
  return `  <figure class="card" data-cat="${esc(o.category)}" data-sev="clean">
    <img loading="lazy" src="${fileUrl(o.full)}" alt="${esc(o.slug)}">
    <figcaption>${esc(o.slug + "/" + o.name)}</figcaption>
  </figure>`;
}

const site = collectSite();
const note = WITH_NOTE ? collectNote() : [];
const siteCats = [...new Set(site.map((i) => i.category))].sort();

const sevButtons = hasAudit
  ? `<span class="sep">|</span>
  <button onclick="fs('')">全 severity</button>
  <button onclick="fs('high')">&#128308; HIGH</button>
  <button onclick="fs('medium')">&#128993; MEDIUM</button>
  <button onclick="fs('low')">&#128994; LOW</button>
  <button onclick="fs('clean')">&#9989; clean</button>`
  : "";

const noteSection = WITH_NOTE
  ? `<h2 class="sec">note 図版 PNG（${note.length}）</h2>
<div class="grid">
${note.map(cardNote).join("\n")}
</div>`
  : "";

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>SVG Gallery (${site.length}${WITH_NOTE ? `+${note.length}` : ""})</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f5;color:#222}
  header{position:sticky;top:0;z-index:9;background:#fff;padding:10px 16px;border-bottom:1px solid #ddd;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  header b{margin-right:10px}
  .sep{color:#bbb;margin:0 4px}
  button{font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fff;cursor:pointer}
  button:hover{border-color:#2e6da4;color:#2e6da4}
  h2.sec{margin:18px 16px 0;font-size:14px;color:#1a3a5c}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:16px}
  .card{margin:0;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
  .card img{width:100%;display:block;background:#fff;padding:8px;box-sizing:border-box}
  figcaption{font-size:11px;color:#555;padding:6px 8px;word-break:break-all;border-top:1px solid #f0f0f0}
  .sev{font-size:12px}
  .badge{color:#8a8a8a}
  .pat{color:#b22234;margin-top:2px}
</style></head>
<body>
<header><b>SVG Gallery — site ${site.length} 枚${WITH_NOTE ? ` / note ${note.length} 枚` : ""}</b>
  <button onclick="fc('')">全カテゴリ</button>
  ${siteCats.map((c) => `<button onclick="fc('${esc(c)}')">${esc(c)}</button>`).join("\n  ")}
  ${sevButtons}
</header>
<h2 class="sec">site 記事図版 SVG（${site.length}）</h2>
<div class="grid">
${site.map(cardSite).join("\n")}
</div>
${noteSection}
<script>
var cF='',sF='';
function apply(){document.querySelectorAll('.card').forEach(function(el){
  var okc=(!cF||el.dataset.cat===cF);
  var oks=(!sF||el.dataset.sev===sF);
  el.style.display=(okc&&oks)?'':'none';
});}
function fc(c){cF=c;apply();}
function fs(s){sF=s;apply();}
</script>
</body></html>`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`[svg-gallery] site ${site.length} 枚 / ${siteCats.length} カテゴリ${WITH_NOTE ? ` + note ${note.length} 枚` : ""}${hasAudit ? " (audit バッジ付き)" : " (audit 無し)"} → ${OUT}`);

if (process.argv.includes("--open")) {
  try {
    execFileSync("cmd", ["/c", "start", "", OUT.replace(/\//g, "\\")], { stdio: "ignore" });
    console.log("[svg-gallery] 既定ブラウザで開きました");
  } catch {
    console.log("[svg-gallery] 自動オープン不可。手動で開いてください:", OUT);
  }
}
