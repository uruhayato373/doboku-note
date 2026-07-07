/**
 * content.mjs — 記事 / note 記事 / マガジン一覧（P4・読み取り専用）。
 *
 *   articlesIndex() … src/config/doc-meta-index.json（refresh-indexes 生成・1056 published）
 *   magazines()     … src/lib/note-magazines.ts を regex 抽出（verify-note-magazines.mjs L107 と同方式・tsx 不要）
 *   noteArticles()  … docs/note/** の article*.md frontmatter（notePricing / noteUrl / noteSeries）
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const DOC_META = join(ROOT, "src", "config", "doc-meta-index.json");
const SOT = join(ROOT, "src", "lib", "note-magazines.ts");
const NOTE = join(ROOT, "docs", "note");

function readJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// ─── サイト記事一覧（doc-meta-index.json）────────────────────
export function articlesIndex() {
  const d = readJson(DOC_META);
  if (!d) return { summary: {}, docs: [] };
  const docs = Object.entries(d.docs || {}).map(([slug, m]) => ({
    slug,
    title: m.title || slug,
    category: m.category || "?",
    group: m.group || "other",
    published: m.published !== false,
    publishedAt: m.publishedAt || m.created || null,
    dateModified: m.dateModified || null,
    reviewStatus: m.reviewStatus || null,
  }));
  docs.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "") || a.slug.localeCompare(b.slug));
  return { summary: d.summary || {}, generatedAt: d.generated_at || null, docs };
}

// ─── マガジン一覧（note-magazines.ts の regex 抽出）──────────
export function magazines() {
  if (!existsSync(SOT)) return [];
  const ts = readFileSync(SOT, "utf8");
  // id / published / noteUrl はこの順で固定（ファイル規約・verify-note-magazines.mjs と同じ）
  const re = /id:\s*'([^']+)',\s*published:\s*(true|false),\s*noteUrl:\s*'([^']*)'/g;
  const idx = [];
  let m;
  while ((m = re.exec(ts)) !== null) {
    idx.push({ id: m[1], published: m[2] === "true", noteUrl: m[3], at: m.index });
  }
  return idx.map((cur, i) => {
    const slice = ts.slice(cur.at, idx[i + 1] ? idx[i + 1].at : ts.length);
    const pick = (re2) => { const mm = slice.match(re2); return mm ? mm[1] : null; };
    const priceStr = pick(/price:\s*'([^']*)'/);
    return {
      id: cur.id,
      published: cur.published,
      noteUrl: cur.noteUrl,
      key: (cur.noteUrl.match(/\/m\/(m[0-9a-f]+)/) || [])[1] || null,
      title: pick(/title:\s*'([^']*)'/) || pick(/title:\s*"([^"]*)"/),
      badge: pick(/badge:\s*'([^']*)'/),
      priceStr,
      priceNum: priceStr ? Number((priceStr.match(/¥?\s*([\d,]+)/) || [])[1]?.replace(/,/g, "")) || null : null,
    };
  });
}

// ─── note 記事一覧（docs/note の article*.md frontmatter）────
export function noteArticles() {
  const items = [];
  const walk = (absDir, rel) => {
    let entries;
    try { entries = readdirSync(absDir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name === "img") continue;
        walk(join(absDir, e.name), rel ? `${rel}/${e.name}` : e.name);
      } else if (/^article[A-Za-z0-9-]*\.md$/.test(e.name)) {
        let fm = {};
        try { fm = matter(readFileSync(join(absDir, e.name), "utf8")).data || {}; } catch { /* skip */ }
        items.push({
          rel: `${rel}/${e.name}`,
          dir: rel,
          file: e.name,
          title: fm.title || rel.split("/").pop(),
          pricing: fm.notePricing || "unknown",
          series: fm.noteSeries || fm.noteMagazine || null,
          noteUrl: fm.noteUrl || null,
          published: !!fm.noteUrl, // noteUrl があれば公開済みと見なす
          exam: rel.split("/")[0],
        });
      }
    }
  };
  if (existsSync(NOTE)) walk(NOTE, "");
  items.sort((a, b) => a.rel.localeCompare(b.rel));
  return items;
}
