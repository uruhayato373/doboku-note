/**
 * OGP ギャラリー — 全 ogp.png を1枚の HTML で一覧確認する QA ツール。
 *
 * 一括再生成（npm run ogp -- --all --force）後の目視チェック用。
 * 長いタイトルのはみ出し・改行崩れ・テーマ色枠・余白などをまとめて確認できる。
 *
 * 絞り込み UI:
 *   - 資格試験（categories.json の日本語ラベル・order 順）
 *   - 各資格内の分類（ガイド／過去問／テキスト／キーワード 等＝frontmatter.group）
 *     資格を選ぶと、その資格に存在する分類だけがボタンに残る。
 *
 * Usage:
 *   node scripts/ogp-gallery.mjs            → .tmp/ogp-gallery.html を生成
 *   node scripts/ogp-gallery.mjs --open     → 生成して既定ブラウザで開く（Windows）
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = process.cwd();
const POSTS = SITE_CONTENT_ROOT;
const OUT = join(ROOT, ".tmp", "ogp-gallery.html");

// 資格試験ラベル（日本語）と表示順
const CATEGORIES = JSON.parse(
  readFileSync(join(ROOT, "src", "config", "categories.json"), "utf8"),
);
const CAT_LABEL = new Map(CATEGORIES.map((c) => [c.slug, c.label]));
const CAT_ORDER = new Map(CATEGORIES.map((c) => [c.slug, c.order ?? 999]));

// 分類（frontmatter.group）→ 日本語ラベル
const GROUP_LABEL = {
  guide: "ガイド",
  textbook: "テキスト",
  keyword: "キーワード",
  pillar: "まとめ",
  primary: "過去問（一次）",
  secondary: "過去問（二次）",
  "past-exam": "過去問",
  other: "その他",
};
const GROUP_ORDER = ["keyword", "past-exam", "primary", "secondary", "textbook", "guide", "pillar", "other"];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
  .map((p) => String(p).replace(/\\/g, "/"))
  .filter((p) => p.endsWith("/ogp.png"));

const items = rels
  .map((rel) => {
    const slugDir = dirname(rel);
    const category = slugDir.split("/")[0];
    // 記事本体の解決順:
    //  Convention B: <cat>/<slug>/article.mdx ／ Convention A: <cat>/<slug>.mdx（兄弟）
    //  フラット slug: <cat>-<slug>/article.mdx（記事は平坦dir・OGP は getOgpImageUrl 準拠で
    //  nested <cat>/<slug>/ogp.png に出る。例: pe-construction-guide-required-essay）
    let mdx = join(POSTS, slugDir, "article.mdx");
    if (!existsSync(mdx)) mdx = join(POSTS, slugDir + ".mdx");
    if (!existsSync(mdx)) mdx = join(POSTS, slugDir.replace(/\//g, "-"), "article.mdx");
    let group = "other";
    if (existsSync(mdx)) {
      try {
        const g = matter(readFileSync(mdx, "utf8")).data.group;
        if (g && GROUP_LABEL[g]) group = g;
      } catch {
        /* keep other */
      }
    }
    const full = join(POSTS, rel).replace(/\\/g, "/");
    return { rel, slugDir, category, group, full };
  })
  .sort((a, b) => a.rel.localeCompare(b.rel));

// 資格一覧（order 順）と件数
const catCount = {};
for (const i of items) catCount[i.category] = (catCount[i.category] || 0) + 1;
const cats = [...new Set(items.map((i) => i.category))].sort(
  (a, b) => (CAT_ORDER.get(a) ?? 999) - (CAT_ORDER.get(b) ?? 999) || a.localeCompare(b),
);

// 各資格に存在する分類（資格選択時のサブフィルタ用）
const groupsByCat = {};
for (const i of items) {
  (groupsByCat[i.category] ??= new Set()).add(i.group);
}
const GROUPS_BY_CAT = Object.fromEntries(
  Object.entries(groupsByCat).map(([c, set]) => [
    c,
    GROUP_ORDER.filter((g) => set.has(g)),
  ]),
);
const allGroups = GROUP_ORDER.filter((g) => items.some((i) => i.group === g));

const catBtns = [
  `<button class="cat active" data-cat="" onclick="pickCat(this,'')">全て <span class="n">${items.length}</span></button>`,
  ...cats.map(
    (c) =>
      `<button class="cat" data-cat="${c}" onclick="pickCat(this,'${c}')">${esc(
        CAT_LABEL.get(c) || c,
      )} <span class="n">${catCount[c]}</span></button>`,
  ),
].join("\n  ");

const groupBtns = [
  `<button class="grp active" data-group="" onclick="pickGroup(this,'')">全分類</button>`,
  ...allGroups.map(
    (g) =>
      `<button class="grp" data-group="${g}" onclick="pickGroup(this,'${g}')">${esc(
        GROUP_LABEL[g],
      )}</button>`,
  ),
].join("\n  ");

const cards = items
  .map(
    (o) => `  <figure class="card" data-cat="${o.category}" data-group="${o.group}">
    <img loading="lazy" src="file:///${o.full}" alt="${esc(o.slugDir)}">
    <figcaption>${esc(o.slugDir)}</figcaption>
  </figure>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>OGP Gallery (${items.length})</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f5;color:#222}
  header{position:sticky;top:0;z-index:9;background:#fff;border-bottom:1px solid #ddd;padding:10px 16px}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .row + .row{margin-top:8px;padding-top:8px;border-top:1px dashed #e5e5e5}
  .row b{margin-right:8px;font-size:12px;color:#666;min-width:64px}
  button{font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fff;cursor:pointer}
  button:hover{border-color:#16365C;color:#16365C}
  button.active{background:#16365C;color:#fff;border-color:#16365C}
  button .n{opacity:.7;font-size:11px}
  button.active .n{opacity:.85}
  button[hidden]{display:none}
  .count{margin-left:auto;font-size:12px;color:#888}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;padding:16px}
  .card{margin:0;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden}
  .card img{width:100%;display:block;background:#fafafa}
  figcaption{font-size:11px;color:#555;padding:6px 8px;word-break:break-all}
</style></head>
<body>
<header>
  <div class="row"><b>資格試験</b>
  ${catBtns}
  </div>
  <div class="row"><b>分類</b>
  ${groupBtns}
  <span class="count" id="count"></span>
  </div>
</header>
<div class="grid" id="g">
${cards}
</div>
<script>
  var GROUPS_BY_CAT = ${JSON.stringify(GROUPS_BY_CAT)};
  var selCat = '', selGroup = '';
  function pickCat(btn, c){
    selCat = c;
    document.querySelectorAll('button.cat').forEach(function(b){b.classList.toggle('active', b===btn)});
    // この資格に無い分類ボタンは隠す。隠れた分類が選択中なら全分類へ戻す
    var allow = c ? GROUPS_BY_CAT[c] : null;
    document.querySelectorAll('button.grp').forEach(function(b){
      var g = b.dataset.group;
      var ok = !g || !allow || allow.indexOf(g) !== -1;
      b.hidden = !ok;
      if(!ok && selGroup === g){ selGroup = ''; }
    });
    syncGroupActive();
    apply();
  }
  function pickGroup(btn, g){ selGroup = g; syncGroupActive(); apply(); }
  function syncGroupActive(){
    document.querySelectorAll('button.grp').forEach(function(b){
      b.classList.toggle('active', b.dataset.group === selGroup);
    });
  }
  function apply(){
    var shown = 0;
    document.querySelectorAll('.card').forEach(function(el){
      var ok = (!selCat || el.dataset.cat === selCat) && (!selGroup || el.dataset.group === selGroup);
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
  `[ogp-gallery] ${items.length} 枚 / ${cats.length} 資格 / ${allGroups.length} 分類 → ${OUT}`,
);

if (process.argv.includes("--open")) {
  try {
    execFileSync("cmd", ["/c", "start", "", OUT.replace(/\//g, "\\")], { stdio: "ignore" });
    console.log("[ogp-gallery] 既定ブラウザで開きました");
  } catch {
    console.log("[ogp-gallery] 自動オープン不可。手動で開いてください:", OUT);
  }
}
