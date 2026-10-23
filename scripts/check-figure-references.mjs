#!/usr/bin/env node
/**
 * check-figure-references.mjs — 書籍由来の記事の図番号・図名・本文の参照のずれを検査する（DN-0557）。
 *
 * 対象: content/site/civil-construction-1・civil-construction-2 の記事のうち、frontmatter の sources に
 *   commercial-book の id を持ち、ArticleImage の caption に「図X.Y」を付けているもの。
 * 判定の定義は scripts/lib/figure-references.mjs。
 *
 * モード:
 *   既定        記事だけで決まる判定（重複・分割の印・alt 食い違い・本文参照の節）。CI の Pre-merge に載せる（quality-audit ci:true）
 *   --ocr       上に加えて書籍 OCR の図名と突合する。OCR は市販書籍の図名を含み git に置けない（code.md・datasets 台帳の規約）ので
 *               手元の content/sources/books/<dir>/ocr か Drive vault（原資料PDF/書籍/<dir>/ocr）から読む。
 *               どちらにも無ければ検査不成立で exit 2（0 件を緑にしない）。CI は Drive を持たないので ci:false の report 区分
 * 出力: 対象記事数・図の数・実検査数（突合した図の数）・不一致数。
 * exit 0 = 不一致 0 かつ検査した / 1 = 不一致あり / 2 = 検査不成立（対象 0 件・--ocr で OCR が読めない）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadReferenceSources, splitSourceRef } from './lib/reference-sources.mjs';
import { bookRepoRoot } from './lib/reference-book-bundle.mjs';
import { listSiteMdx } from './lib/mdx-files.mjs';
import { readVaultDir, readVaultFile, resolveVaultRoot } from './lib/drive-vault.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { checkAgainstOcr, checkArticleFigures, parseArticleFigures, parseOcrFigureNames } from './lib/figure-references.mjs';

const TAG = '[check-figure-references]';
const OCR = process.argv.includes('--ocr');
const SCOPES = ['civil-construction-1', 'civil-construction-2'];

const cfg = loadReferenceSources();
const commercial = new Map(cfg.sources.filter((s) => s.class === 'commercial-book').map((s) => [s.id, s]));

// Drive の読み取り失敗（ETIMEDOUT など）は「OCR を読めない」と同じ扱い（ocrMissing に数え、全部読めなければ exit 2）
const ocrFiles = (dir) => {
  if (!existsSync(dir)) return [];
  const r = readVaultDir(dir);
  return r.ok ? r.data.filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : [];
};

/** OCR の実体がある置き場を返す。repo の ocr/ は README.md だけの空殻のことがある（git 管理外）ので、中身のあるものを選ぶ。 */
function ocrDirFor(source, vaultRoot) {
  if (!source.bookBundle) return null;
  const candidates = [join(REPO_ROOT, bookRepoRoot(source), 'ocr')];
  if (vaultRoot) candidates.push(join(vaultRoot, '原資料PDF', '書籍', source.bookBundle.directory, 'ocr'));
  return candidates.find((d) => ocrFiles(d).length > 0) ?? null;
}

const ocrCache = new Map();
function loadOcr(id, vaultRoot) {
  if (ocrCache.has(id)) return ocrCache.get(id);
  const dir = ocrDirFor(commercial.get(id), vaultRoot);
  let idx = null;
  if (dir) {
    const reads = ocrFiles(dir).map((f) => readVaultFile(join(dir, f), 'utf8'));
    if (reads.every((r) => r.ok)) idx = parseOcrFigureNames(reads.map((r) => r.data).join('\n'));
  }
  ocrCache.set(id, idx);
  return idx;
}

const vault = OCR ? resolveVaultRoot() : { root: null };
const targets = [];
for (const scope of SCOPES) {
  for (const file of listSiteMdx({ dir: join(SITE_CONTENT_ROOT, scope) })) {
    const text = readFileSync(file, 'utf8');
    const fm = matter(text).data;
    const ids = (Array.isArray(fm.sources) ? fm.sources : []).map((s) => splitSourceRef(String(s)).id ?? String(s).split('#')[0]).filter((id) => commercial.has(id));
    if (ids.length === 0) continue;
    const pf = parseArticleFigures(text);
    if (!pf.figures.some((f) => f.key) && pf.refs.length === 0) continue;
    targets.push({ file, text, ids });
  }
}

if (targets.length === 0) {
  console.error(`${TAG} 検査不成立: 対象記事が 0 件（sources に市販書籍を持ち、図X.Y の caption がある記事が無い）`);
  process.exit(2);
}

let figures = 0;
let numbered = 0;
let refs = 0;
let ocrChecked = 0;
const bad = [];
let ocrMissing = [];
for (const t of targets) {
  const rel = t.file.slice(REPO_ROOT.length + 1);
  const r = checkArticleFigures(t.text);
  figures += r.figures; numbered += r.numbered; refs += r.refs;
  for (const p of r.problems) bad.push({ rel, ...p });
  if (OCR) {
    const byBook = new Map();
    for (const id of t.ids) {
      const idx = loadOcr(id, vault.root);
      if (idx) byBook.set(id, idx); else if (!ocrMissing.includes(id)) ocrMissing.push(id);
    }
    if (byBook.size === 0) continue;
    const { figures: figs } = parseArticleFigures(t.text);
    const o = checkAgainstOcr(figs, byBook);
    ocrChecked += o.checked;
    for (const p of o.problems) bad.push({ rel, ...p });
  }
}

for (const b of bad) console.log(`${b.rel}:${b.line} [${b.kind}] ${b.detail}`);
console.log(`${TAG} 対象記事 ${targets.length} 本 / 図 ${figures} 枚（図番号付き ${numbered}）/ 本文の図参照 ${refs} 件 / 不一致 ${bad.length} 件`
  + (OCR ? ` / OCR 突合した図 ${ocrChecked} 枚` : ' / OCR 突合なし（--ocr で書籍の図名と照合）'));

if (OCR) {
  if (ocrChecked === 0) {
    console.error(`${TAG} 検査不成立: 書籍 OCR を読めず突合した図が 0 枚（${vault.root ? '' : vault.reason + ' '}読めなかった書籍: ${ocrMissing.join(', ') || '(なし)'}）`);
    process.exit(2);
  }
  if (ocrMissing.length) console.log(`${TAG} OCR を読めず突合から外れた書籍: ${ocrMissing.join(', ')}`);
}
process.exit(bad.length ? 1 : 0);
