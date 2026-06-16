/**
 * OGP ギャラリー — 全 ogp.png を1枚の HTML で一覧確認する QA ツール。
 *
 * 一括再生成（npm run ogp -- --all --force）後の目視チェック用。
 * 長いタイトルのはみ出し・改行崩れ・テーマ色枠・余白などをまとめて確認できる。
 *
 * Usage:
 *   node scripts/ogp-gallery.mjs            → .tmp/ogp-gallery.html を生成
 *   node scripts/ogp-gallery.mjs --open     → 生成して既定ブラウザで開く（Windows）
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const POSTS = join(ROOT, ".local", "r2", "posts");
const OUT = join(ROOT, ".tmp", "ogp-gallery.html");

const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
  .map((p) => String(p).replace(/\\/g, "/"))
  .filter((p) => p.endsWith("/ogp.png"));

const items = rels
  .map((rel) => {
    const slugDir = dirname(rel);
    const category = slugDir.split("/")[0];
    const full = join(POSTS, rel).replace(/\\/g, "/");
    return { rel, slugDir, category, full };
  })
  .sort((a, b) => a.rel.localeCompare(b.rel));

const cats = [...new Set(items.map((i) => i.category))].sort();

const cards = items
  .map(
    (o) => `  <figure class="card" data-cat="${o.category}">
    <img loading="lazy" src="file:///${o.full}" alt="${o.slugDir}">
    <figcaption>${o.slugDir}</figcaption>
  </figure>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>OGP Gallery (${items.length})</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f5;color:#222}
  header{position:sticky;top:0;z-index:9;background:#fff;padding:10px 16px;border-bottom:1px solid #ddd;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  header b{margin-right:10px}
  button{font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:999px;background:#fff;cursor:pointer}
  button:hover{border-color:#16365C;color:#16365C}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px;padding:16px}
  .card{margin:0;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden}
  .card img{width:100%;display:block;background:#fafafa}
  figcaption{font-size:11px;color:#555;padding:6px 8px;word-break:break-all}
</style></head>
<body>
<header><b>OGP Gallery — ${items.length} 枚</b>
  <button onclick="f('')">全て</button>
  ${cats.map((c) => `<button onclick="f('${c}')">${c}</button>`).join("\n  ")}
</header>
<div class="grid" id="g">
${cards}
</div>
<script>function f(c){document.querySelectorAll('.card').forEach(function(el){el.style.display=(!c||el.dataset.cat===c)?'':'none'})}</script>
</body></html>`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`[ogp-gallery] ${items.length} 枚 / ${cats.length} カテゴリ → ${OUT}`);

if (process.argv.includes("--open")) {
  try {
    execFileSync("cmd", ["/c", "start", "", OUT.replace(/\//g, "\\")], { stdio: "ignore" });
    console.log("[ogp-gallery] 既定ブラウザで開きました");
  } catch {
    console.log("[ogp-gallery] 自動オープン不可。手動で開いてください:", OUT);
  }
}
