/**
 * SVG カタログ生成 — 図版コレクションの SSOT（派生・機械生成）。
 *
 * `.local/r2/posts/**\/img/*.svg`（サイト図版）を走査し、各図版の
 *   - concept（aria-label）/ viewBox / カテゴリ / slug / ファイル名
 *   - embedded（該当 article.mdx が src で参照しているか）
 *   - audit（.claude/state/svg-audit.json の重大度件数）
 * を join した台帳 `.claude/state/svg-catalog.json` を出力する。
 *
 * 手動維持せず再生成で drift を防ぐ（refresh-indexes と同方式）。
 * svg-gallery.mjs は目視ビュー、svg-audit.json は監査結果、本台帳は
 * 「どの概念→どのファイル→埋込/監査状態」を一元管理する SSOT。
 *
 * Usage: node .claude/scripts/build-svg-catalog.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const POSTS = join(ROOT, '.local', 'r2', 'posts');
const AUDIT = join(ROOT, '.claude', 'state', 'svg-audit.json');
const OUT = join(ROOT, '.claude', 'state', 'svg-catalog.json');

// --- 監査結果（あれば）を file -> {high,medium,low} に集約 ---
const auditByFile = {};
if (existsSync(AUDIT)) {
  try {
    const a = JSON.parse(readFileSync(AUDIT, 'utf8'));
    for (const f of a.findings || []) {
      const key = String(f.file).replace(/\\/g, '/');
      const sev = String(f.severity || '').toLowerCase();
      auditByFile[key] = auditByFile[key] || { high: 0, medium: 0, low: 0 };
      if (auditByFile[key][sev] !== undefined) auditByFile[key][sev]++;
    }
  } catch {
    console.warn('[svg-catalog] svg-audit.json の読込に失敗。audit 列は空で継続');
  }
}

const attr = (svg, name) => {
  const m = svg.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};

const entries = [];
const svgFiles = readdirSync(POSTS, { recursive: true })
  .map((p) => String(p).replace(/\\/g, '/'))
  .filter((p) => /\/img\/.+\.svg$/.test(p));

for (const rel of svgFiles) {
  const abs = join(POSTS, rel);
  const parts = rel.split('/'); // {category}/{slug}/img/{file}
  const category = parts[0];
  const slug = parts[1];
  const file = parts[parts.length - 1];
  let svg = '';
  try { svg = readFileSync(abs, 'utf8'); } catch { continue; }

  const concept = attr(svg, 'aria-label');
  const viewBox = attr(svg, 'viewBox');

  // embedded: 同 slug の article.(mdx|md) が当 svg を src 参照しているか
  let embedded = false;
  for (const a of ['article.mdx', 'article.md']) {
    const art = join(POSTS, category, slug, a);
    if (existsSync(art)) {
      const body = readFileSync(art, 'utf8');
      if (body.includes(`/img/${file}`)) { embedded = true; break; }
    }
  }

  const repoRel = `.local/r2/posts/${rel}`;
  entries.push({
    file: repoRel,
    category,
    slug,
    name: file,
    concept: concept || null,
    viewBox: viewBox || null,
    embedded,
    audit: auditByFile[repoRel] || { high: 0, medium: 0, low: 0 },
  });
}

entries.sort((a, b) => a.file.localeCompare(b.file));

const byCategory = {};
for (const e of entries) byCategory[e.category] = (byCategory[e.category] || 0) + 1;

const summary = {
  total: entries.length,
  embedded: entries.filter((e) => e.embedded).length,
  orphan: entries.filter((e) => !e.embedded).length,
  missingConcept: entries.filter((e) => !e.concept).length,
  withHighAudit: entries.filter((e) => e.audit.high > 0).length,
  byCategory,
};

const catalog = {
  description: 'サイト図版SVGの派生カタログ（SSOT）。build-svg-catalog.mjs が生成。手動編集しない。',
  source: '.local/r2/posts/**/img/*.svg',
  summary,
  entries,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

console.log(`[svg-catalog] ${summary.total} 図版 → ${relative(ROOT, OUT)}`);
console.log(`  embedded ${summary.embedded} / orphan ${summary.orphan} / concept欠落 ${summary.missingConcept} / HIGH監査 ${summary.withHighAudit}`);
console.log('  カテゴリ別:', JSON.stringify(byCategory));
