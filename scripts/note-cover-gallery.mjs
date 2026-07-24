/**
 * note カバー ギャラリー — docs/note 配下の全 cover*.png を1枚の HTML で一覧確認する QA ツール。
 *
 * 一括再生成（npm run note-covers）後の目視チェック用。
 * バナー帯のはみ出し・HiBox 文字詰まり・試験色の不整合・中央 630 セーフゾーン崩れ等を
 * まとめて確認できる。OGP の ogp-gallery.mjs に対応する note カバー版。
 *
 * 絞り込み UI:
 *   - 資格試験（note-cover-tokens.json exams[].dir → label・定義順）
 *   - 種別（有料／無料＝notePricing、G2／mono-tag＝cover ブロック有無、マガジン収録）
 *
 * Usage:
 *   node scripts/note-cover-gallery.mjs            → .tmp/note-cover-gallery.html を生成
 *   node scripts/note-cover-gallery.mjs --open     → 生成して既定ブラウザで開く（Windows）
 *   node scripts/note-cover-gallery.mjs --crops    → 各カバーを6表示面（full/square/list/core/card/related）で
 *                                                    実クロップ表示（Crop-safe V4 の切断チェック用。CSS で
 *                                                    定義済み crop 座標を実際に切り出す）。V4 フィルタと併用推奨
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import matter from "gray-matter";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const NOTE = join(ROOT, "docs", "note");
const OUT = join(ROOT, ".tmp", "note-cover-gallery.html");

// 試験区分パレット・dir の真実源
const TOKENS = require(join(ROOT, ".claude", "knowledge", "design-system", "note-cover-tokens.json"));
const EXAMS = TOKENS.exams;
// 定義順（pe-comprehensive, civil-1, ...）を表示順とする
const EXAM_KEYS = Object.keys(EXAMS).filter((k) => k !== "comment");
const EXAM_LABEL = new Map(EXAM_KEYS.map((k) => [k, EXAMS[k].label]));
const EXAM_BASE = new Map(EXAM_KEYS.map((k) => [k, EXAMS[k].base]));

// dir セグメントから exam キーを解決（generate-note-covers.mjs と同義・級別を combined より先に）
function resolveExam(rel) {
  const segs = String(rel).split("/");
  for (const key of EXAM_KEYS) {
    if (key === "civil-1-2") continue;
    if (segs.includes(EXAMS[key].dir)) return key;
  }
  if (segs.includes(EXAMS["civil-1-2"].dir)) return "civil-1-2";
  return "pe-comprehensive";
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// docs/note を走査し cover*.png を集める。対応する article*.md から種別を読む。
function collect(absDir, rel, out = []) {
  for (const e of readdirSync(absDir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      collect(join(absDir, e.name), rel ? `${rel}/${e.name}` : e.name, out);
    }
  }
  // img/ 配下の cover*.png を拾う
  const imgDir = join(absDir, "img");
  if (existsSync(imgDir)) {
    for (const f of readdirSync(imgDir)) {
      if (!/^cover(-[A-Za-z0-9-]+)?\.png$/.test(f)) continue;
      // cover.png → article.md / cover-II1.png → article-II1.md
      const suffix = f.replace(/^cover/, "").replace(/\.png$/, ""); // "" or "-II1"
      const articleFile = `article${suffix}.md`;
      const articlePath = join(absDir, articleFile);
      let pricing = "unknown";
      let mode = "g2";
      let variant = "";
      let inMagazine = rel.split("/").includes("magazines");
      if (existsSync(articlePath)) {
        try {
          const { data } = matter(readFileSync(articlePath, "utf8"));
          pricing = data.notePricing || "unknown";
          const cover = data.cover;
          variant = cover?.variant || "";
          mode = cover && (cover.banner || cover.hi || cover.leadIn || cover.variant) ? "g2" : "mono";
          if (variant === "crop-safe-v4") mode = "v4";
        } catch {
          /* keep defaults */
        }
      }
      out.push({
        rel,
        file: f,
        full: join(imgDir, f).replace(/\\/g, "/"),
        exam: resolveExam(rel),
        pricing,
        mode,
        variant,
        inMagazine,
      });
    }
  }
  return out;
}

const items = collect(NOTE, "").sort((a, b) => a.rel.localeCompare(b.rel) || a.file.localeCompare(b.file));

// 資格一覧（定義順・出現するものだけ）と件数
const examCount = {};
for (const i of items) examCount[i.exam] = (examCount[i.exam] || 0) + 1;
const exams = EXAM_KEYS.filter((k) => examCount[k]);

// 種別タグ（複合）
const KIND_LABEL = {
  paid: "有料",
  free: "無料",
  g2: "G2バナー",
  v4: "Crop-safe V4",
  mono: "mono-tag",
  magazine: "マガジン収録",
};
const KIND_ORDER = ["paid", "free", "g2", "v4", "mono", "magazine"];
function kindsOf(i) {
  const k = [];
  if (i.pricing === "paid") k.push("paid");
  if (i.pricing === "free") k.push("free");
  k.push(i.mode);
  if (i.inMagazine) k.push("magazine");
  return k;
}
// mode（g2/v4/mono）は混在しているときだけフィルタとして出す。全カバーが G2 に統一されている
// 通常時は全件一致＝無意味なので隠す（将来 coverTitle-only の mono が混ざれば自動で復活）。
const showMode = new Set(items.map((i) => i.mode)).size > 1;
const presentKinds = KIND_ORDER.filter((k) => {
  if ((k === "g2" || k === "mono" || k === "v4") && !showMode) return false;
  return items.some((i) => kindsOf(i).includes(k));
});

// ---- 6表示面クロップ（--crops）----
// note の実表示面を CSS で実際に切り出す（単なる縮小ではなく crop 座標を適用）。
// 座標 SSOT: .claude/knowledge/design-system/note-cover-crop-safe-v4.md §9
//   full 1280×670 / square 中央630×630 / list 中央1280×454 / core 中央1280×216 /
//   card 320×168(1.91:1=full縮小) / related 160×110(中央974×670)
const CROPS_MODE = process.argv.includes("--crops");
const CROPS = [
  { id: "full", label: "full 1280×670", x: 0, y: 0, w: 1280, h: 670, dw: 300 },
  { id: "square", label: "square 630×630", x: 325, y: 20, w: 630, h: 630, dw: 132 },
  { id: "list", label: "list 1280×454", x: 0, y: 108, w: 1280, h: 454, dw: 300 },
  { id: "core", label: "core 1280×216", x: 0, y: 227, w: 1280, h: 216, dw: 300 },
  { id: "card", label: "card 320×168", x: 0, y: 0, w: 1280, h: 670, dw: 320, dh: 168 },
  { id: "related", label: "related 160×110", x: 153, y: 0, w: 974, h: 670, dw: 160 },
];
function cropCell(o, c) {
  const s = c.dw / c.w;
  const dh = c.dh || Math.round(c.h * s);
  const imgW = Math.round(1280 * s);
  const ml = -Math.round(c.x * s);
  const mt = -Math.round(c.y * s);
  return `<div class="cropcell"><div class="croplabel">${c.label}</div>
    <div class="cropbox" style="width:${c.dw}px;height:${dh}px"><img loading="lazy" src="file:///${o.full}" style="width:${imgW}px;max-width:none;margin-left:${ml}px;margin-top:${mt}px" alt=""></div></div>`;
}

const examBtns = [
  `<button class="cat active" data-exam="" onclick="pickExam(this,'')">全て <span class="n">${items.length}</span></button>`,
  ...exams.map(
    (k) =>
      `<button class="cat" data-exam="${k}" onclick="pickExam(this,'${k}')"><span class="dot" style="background:${EXAM_BASE.get(
        k,
      )}"></span>${esc(EXAM_LABEL.get(k) || k)} <span class="n">${examCount[k]}</span></button>`,
  ),
].join("\n  ");

const kindBtns = [
  `<button class="grp active" data-kind="" onclick="pickKind(this,'')">全種別</button>`,
  ...presentKinds.map(
    (k) => `<button class="grp" data-kind="${k}" onclick="pickKind(this,'${k}')">${esc(KIND_LABEL[k])}</button>`,
  ),
].join("\n  ");

const cards = items
  .map((o) => {
    const badge = `<span class="badge" style="background:${EXAM_BASE.get(o.exam)}">${esc(EXAMS[o.exam]?.short || o.exam)}</span>`;
    const cap = `${badge}${o.mode === "v4" ? '<span class="badge" style="background:#8a2be2">V4</span>' : ""} ${esc(o.rel)}/${esc(o.file)}`;
    if (CROPS_MODE) {
      return `  <figure class="card wide" data-exam="${o.exam}" data-kinds="${kindsOf(o).join(" ")}">
    <div class="croprow">${CROPS.map((c) => cropCell(o, c)).join("")}</div>
    <figcaption>${cap}</figcaption>
  </figure>`;
    }
    return `  <figure class="card" data-exam="${o.exam}" data-kinds="${kindsOf(o).join(" ")}">
    <img loading="lazy" src="file:///${o.full}" alt="${esc(o.rel)}/${esc(o.file)}">
    <figcaption>${cap}</figcaption>
  </figure>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>note Cover Gallery (${items.length})</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f5;color:#222}
  header{position:sticky;top:0;z-index:9;background:#fff;border-bottom:1px solid #ddd;padding:10px 16px}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .row + .row{margin-top:8px;padding-top:8px;border-top:1px dashed #e5e5e5}
  .row b{margin-right:8px;font-size:12px;color:#666;min-width:64px}
  button{font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
  button:hover{border-color:#16365C;color:#16365C}
  button.active{background:#16365C;color:#fff;border-color:#16365C}
  button .n{opacity:.7;font-size:11px}
  button.active .n{opacity:.85}
  .dot{width:10px;height:10px;border-radius:999px;display:inline-block}
  .count{margin-left:auto;font-size:12px;color:#888}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:16px;padding:16px}
  .card{margin:0;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden}
  .card img{width:100%;display:block;background:#fafafa}
  .card.wide{grid-column:1/-1}
  .croprow{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;padding:10px}
  .cropcell{display:flex;flex-direction:column;gap:4px}
  .croplabel{font-size:10px;color:#777;font-weight:600}
  .cropbox{position:relative;overflow:hidden;border:1px solid #ddd;background:#fafafa}
  .cropbox img{position:absolute;top:0;left:0;display:block;width:auto}
  figcaption{font-size:11px;color:#555;padding:6px 8px;word-break:break-all}
  .badge{color:#fff;border-radius:4px;padding:1px 6px;margin-right:4px;font-size:10px;white-space:nowrap}
</style></head>
<body>
<header>
  <div class="row"><b>資格試験</b>
  ${examBtns}
  </div>
  <div class="row"><b>種別</b>
  ${kindBtns}
  <span class="count" id="count"></span>
  </div>
</header>
<div class="grid" id="g">
${cards}
</div>
<script>
  var selExam = '', selKind = '';
  function pickExam(btn, c){
    selExam = c;
    document.querySelectorAll('button.cat').forEach(function(b){b.classList.toggle('active', b===btn)});
    apply();
  }
  function pickKind(btn, k){
    selKind = k;
    document.querySelectorAll('button.grp').forEach(function(b){b.classList.toggle('active', b===btn)});
    apply();
  }
  function apply(){
    var shown = 0;
    document.querySelectorAll('.card').forEach(function(el){
      var kinds = el.dataset.kinds.split(' ');
      var ok = (!selExam || el.dataset.exam === selExam) && (!selKind || kinds.indexOf(selKind) !== -1);
      el.style.display = ok ? '' : 'none';
      if(ok) shown++;
    });
    document.getElementById('count').textContent = shown + ' 枚表示';
  }
  apply();
</script>
</body></html>`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(
  `[note-cover-gallery] ${items.length} 枚 / ${exams.length} 資格 / ${presentKinds.length} 種別 → ${OUT}`,
);

if (process.argv.includes("--open")) {
  try {
    execFileSync("cmd", ["/c", "start", "", OUT.replace(/\//g, "\\")], { stdio: "ignore" });
    console.log("[note-cover-gallery] 既定ブラウザで開きました");
  } catch {
    console.log("[note-cover-gallery] 自動オープン不可。手動で開いてください:", OUT);
  }
}
