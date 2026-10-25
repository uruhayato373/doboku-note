#!/usr/bin/env node
/**
 * standards-tables.mjs — 公的基準の章記事の表を、原本と照合して組み直す作業の道具（/standards-table-rebuild）。
 *
 * 組み直した表の置き場と規則は content/sources/standards/tables/README.md。生成器（build-standard-articles）は
 * 承認済み（review.status = approved）で文字の過不足ゼロのものだけを使い、検査は check-standard-articles 14 が行う。
 * 作業の中間物（台帳・作業票・確認用の表・PDF から作ったページ画像）は .tmp/standards-tables/ に置く（作り直せる）。
 *
 * ページ画像の正は Google Drive vault（原資料PDF/共通仕様書/{整備局}/{原本PDF名}/pages/p0001.jpg・
 * npm run build-standards-page-images が作る・content/sources/standards/{機関}/{文書}/manifest.json に provenance）。
 * vault が見えない PC では render で原本 PDF（catalog の sourceSha256 と一致するもの）から必要なページだけ作る。
 *
 *   npm run standards-tables -- inventory                     版面のまま残った表の台帳（中身の同じ表は key で 1 つ）
 *   npm run standards-tables -- sheets [--qa] [--name <接頭辞>] [--document <機関/文書>] [--chapter <章ID の接頭辞>]
 *                                                             作業票（--qa: 未承認の組み直しを照合用に。--document・--chapter で対象を絞る）
 *   npm run standards-tables -- validate --batch <束> | <key…>  文字の過不足の照合と確認用の表（下書きも approved とみなす）
 *   npm run standards-tables -- review <key> --status approved|rejected --note "…"   照合役の判定を書く（review 欄だけ）
 *   npm run standards-tables -- render --agency <機関> --pdf <原本PDF>                vault が無い PC で画像を作る
 *
 * 終了コード: 0 = 成功 / 1 = 照合に落ちた・書けなかった / 2 = 対象 0 件・入力が無い（検査不成立）
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readJson, writeJson } from './lib/json-io.mjs';
import { CONTENT_SOURCES_ROOT, REPO_ROOT } from './lib/repository-paths.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { applyTableOverride, tableKey } from './lib/standards-table.mjs';
import { TABLE_OVERRIDES_ROOT, getCatalog, loadOverrides, loadTableOverrides } from './lib/standards-structure.mjs';
import { buildDocument } from './build-standard-articles.mjs';

const WORK = join(REPO_ROOT, '.tmp', 'standards-tables');
const INVENTORY = join(WORK, 'inventory.json');
const BATCHES = join(WORK, 'batches');
const PREVIEW = join(WORK, 'preview');
const RENDERED = join(WORK, 'pages');
const STANDARDS_VAULT_DIR = '原資料PDF/共通仕様書';
/** 1 束の大きさ（Writer 1 体が画像と見比べて組める量） */
const MAX_ROWS = 220;
const MAX_TABLES = 14;

const args = parseCliArgs({
  batch: { type: 'string' },
  qa: { type: 'boolean' },
  name: { type: 'string', default: '' },
  status: { type: 'string' },
  note: { type: 'string', default: '' },
  agency: { type: 'string' },
  pdf: { type: 'string' },
  dpi: { type: 'integer', default: 170 },
  document: { type: 'string' },
  chapter: { type: 'string' },
});
const [command, ...rest] = args._;

const fail = (message, code = 1) => {
  console.error(`[standards-tables] ${message}`);
  process.exitCode = code;
};
const pad = (page) => `p${String(page).padStart(4, '0')}`;

// ---- 台帳 ---------------------------------------------------------------

function inventory() {
  const overrides = loadOverrides();
  const catalog = getCatalog();
  const verbatimTables = [];
  for (const target of overrides.build?.documents ?? []) {
    const [agencyId, documentId] = target.split('/');
    const document = catalog.documents.find((d) => d.agencyId === agencyId && d.documentId === documentId);
    buildDocument(document, overrides, { write: false, verbatimTables });
  }
  // 同じ表（key）の代表は、比較の基準の近畿版 → 別の仕様書の北海道版 → その他（その文書のページ画像で照合する）
  const rank = (doc) => (doc === 'kinki/common' ? 0 : doc === 'hokkaido/common' ? 1 : 2);
  verbatimTables.sort((a, b) => rank(a.document) - rank(b.document));
  const byKey = new Map();
  for (const table of verbatimTables) {
    const seen = `${table.document} ${table.chapterId} p${table.pages.join(',')}`;
    if (byKey.has(table.key)) byKey.get(table.key).seenIn.push(seen);
    else byKey.set(table.key, { ...table, seenIn: [seen] });
  }
  mkdirSync(WORK, { recursive: true });
  writeFileSync(INVENTORY, `${JSON.stringify([...byKey.values()], null, 2)}\n`);
  console.log(`[standards-tables] 版面のまま残った表 ${verbatimTables.length} 件（中身の違う表 ${byKey.size} 種類）→ ${INVENTORY}`);
}

function loadInventory() {
  if (!existsSync(INVENTORY)) {
    fail(`台帳が無い（先に inventory）: ${INVENTORY}`, 2);
    return null;
  }
  return JSON.parse(readFileSync(INVENTORY, 'utf8'));
}

// ---- ページ画像 ---------------------------------------------------------

/** 文書のページ画像のパス。vault の 270dpi 画像を優先し、無ければ render で作ったもの。どちらも無ければ null */
function pageImage(document, page) {
  const [agencyId, documentId] = document.split('/');
  const vault = resolveVaultRoot();
  const manifestPath = join(CONTENT_SOURCES_ROOT, 'standards', agencyId, documentId, 'manifest.json');
  if (vault.root && existsSync(manifestPath)) {
    const { sourceFile } = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const path = join(vault.root, ...STANDARDS_VAULT_DIR.split('/'), sourceFile.replace(/\.pdf$/i, ''), 'pages', `${pad(page)}.jpg`);
    if (existsSync(path)) return path;
  }
  const rendered = join(RENDERED, agencyId, `${pad(page)}.png`);
  return existsSync(rendered) ? rendered : null;
}

function render() {
  if (!args.agency || !args.pdf) return fail('render には --agency と --pdf が要る', 2);
  const document = getCatalog().documents.find((d) => d.agencyId === args.agency && d.role === 'common');
  if (!document) return fail(`catalog に ${args.agency} の共通仕様書が無い`, 2);
  const sha = createHash('sha256').update(readFileSync(args.pdf)).digest('hex');
  if (sha !== document.sourceSha256) return fail(`原本の SHA-256 が catalog と違う（${sha}）。別の版の PDF は使わない`);
  const entries = loadInventory();
  if (!entries) return;
  const pages = [...new Set(entries.filter((e) => e.document.startsWith(`${args.agency}/`)).flatMap((e) => e.pages))].sort((a, b) => a - b);
  if (pages.length === 0) return fail(`台帳に ${args.agency} の表が無い（画像を作るページが 0）`, 2);
  const out = join(RENDERED, args.agency);
  mkdirSync(out, { recursive: true });
  for (const page of pages) {
    const target = join(out, `${pad(page)}.png`);
    if (existsSync(target)) continue;
    try {
      // pdftoppm（Mac・poppler）を優先し、無ければ PyMuPDF（Windows で pip install pymupdf 済みなら使える）
      execFileSync('pdftoppm', ['-png', '-r', String(args.dpi), '-f', String(page), '-l', String(page), '-singlefile', args.pdf, target.replace(/\.png$/, '')]);
    } catch {
      const python = 'import sys, fitz\ndoc = fitz.open(sys.argv[1])\ndoc[int(sys.argv[2]) - 1].get_pixmap(dpi=int(sys.argv[3])).save(sys.argv[4])\n';
      execFileSync('python', ['-I', '-c', python, args.pdf, String(page), String(args.dpi), target]);
    }
  }
  console.log(`[standards-tables] ${args.agency}: ${pages.length} ページの画像 → ${out}`);
}

// ---- 作業票 -------------------------------------------------------------

function sheets() {
  const all = loadInventory();
  if (!all) return;
  const overrides = loadTableOverrides();
  const file = (key) => overrides.get(key);
  // 既定: 組み直しがまだ無い表。--qa: 組み直しがあって未承認の表（照合役に渡す）
  // --document・--chapter（章 ID の接頭辞。`9-` なら第9編の全章）で対象を絞る（大きな文書を工種ごとに回すため）
  const inScope = (entry) => (!args.document || entry.document === args.document)
    && (!args.chapter || entry.chapterId === args.chapter || entry.chapterId.startsWith(String(args.chapter)));
  const entries = all.filter((entry) => inScope(entry) && (args.qa ? file(entry.key) && file(entry.key).review?.status !== 'approved' : !file(entry.key)));
  if (entries.length === 0) {
    console.log(`[standards-tables] 作業票の対象 0 件（${args.qa ? '未承認の組み直しが無い' : 'すべて組み直し済み'}）`);
    return;
  }
  const rank = (doc) => (doc === 'kinki/common' ? 0 : doc === 'hokkaido/common' ? 1 : 2);
  const chapterRank = (id) => id.split('-').map(Number).reduce((a, n) => a * 100 + n, 0);
  // 束は文書ごとに作る（機関でまとめると文書が入り混じって束が細切れになり、同じ機関の文書どうしで束の名前が重なる。DN-0850）
  entries.sort((a, b) => rank(a.document) - rank(b.document) || a.document.localeCompare(b.document) || chapterRank(a.chapterId) - chapterRank(b.chapterId) || a.pages[0] - b.pages[0]);
  // 地域版にしかない表で、その機関のページ画像が無いときは、近畿版の同じ表（同じ章・同じキャプション）の画像で構造を見る
  const kinkiRef = (entry) => {
    const same = all.filter((t) => t.document === 'kinki/common' && t.chapterId === entry.chapterId);
    const caption = entry.caption.join('').replace(/\s+/g, '');
    return same.find((t) => caption && t.caption.join('').replace(/\s+/g, '') === caption) ?? same.find((t) => t.context === entry.context);
  };
  const imagesFor = (entry) => {
    const own = entry.pages.map((p) => pageImage(entry.document, p));
    if (own.every(Boolean)) return { images: own, borrowed: false };
    const ref = kinkiRef(entry);
    return { images: ref ? ref.pages.map((p) => pageImage('kinki/common', p)).filter(Boolean) : [], borrowed: true };
  };

  const batches = [];
  let current = null;
  for (const entry of entries) {
    const doc = entry.document.replace('/', '-');
    if (!current || current.doc !== doc || current.rows + entry.body.length > MAX_ROWS || current.entries.length >= MAX_TABLES) {
      const count = batches.filter((b) => b.doc === doc).length + 1;
      current = { name: `${args.name ? `${args.name}-` : ''}${args.qa ? 'qa-' : ''}${doc}-${String(count).padStart(2, '0')}`, doc, rows: 0, entries: [] };
      batches.push(current);
    }
    current.rows += entry.body.length;
    current.entries.push(entry);
  }
  mkdirSync(BATCHES, { recursive: true });
  let missingImages = 0;
  for (const batch of batches) {
    writeJson(BATCHES, `${batch.name}.json`, { name: batch.name, keys: batch.entries.map((e) => e.key) });
    const md = [`# 作業票 ${batch.name}（${batch.entries.length} 表・${batch.rows} 行）`, ''];
    batch.entries.forEach((entry, index) => {
      const prev = batch.entries[index - 1];
      const { images, borrowed } = imagesFor(entry);
      if (images.length === 0) missingImages += 1;
      md.push(
        `## ${index + 1}. key ${entry.key}`,
        '',
        `- 文書: ${entry.document}　章: ${entry.chapterId}　原本 PDF ページ: ${entry.pages.join(', ')}`,
        `- 直前の見出し: ${entry.context || '（章冒頭）'}`,
        `- キャプション（版面の外。表に含めない）: ${entry.caption.map((c) => c.trim()).join(' ') || 'なし'}`,
        `- ページ画像: ${images.length ? images.join(' , ') : 'なし（vault が見えない PC は render で作る）'}${borrowed && images.length ? '（この機関の画像が無いので近畿版の同じ表の画像。文字は下の版面が正）' : ''}`,
        `- 同じ表の出現: ${entry.seenIn.join(' / ')}`,
        prev && prev.chapterId === entry.chapterId && entry.caption.length === 0
          ? `- 直前の表（同じ章）: ${prev.key}（ページをまたいだ続きなら headerFrom にこの key を書ける）`
          : '- 直前の表: なし',
        '',
        '版面（layout にこの行をそのまま写す）:',
        '',
        '```text',
        ...entry.body,
        '```',
        '',
      );
    });
    writeFileSync(join(BATCHES, `${batch.name}.md`), md.join('\n'));
  }
  console.log(batches.map((b) => `${b.name}: ${b.entries.length} 表 / ${b.rows} 行`).join('\n'));
  console.log(`[standards-tables] 束 ${batches.length} / 表 ${entries.length} / 画像の無い表 ${missingImages} → ${BATCHES}`);
  if (missingImages > 0) fail(`画像の無い表が ${missingImages} 件ある（vault を同期するか render で作る）`, 2);
}

// ---- 照合 ---------------------------------------------------------------

function validate() {
  const all = loadInventory();
  if (!all) return;
  const byKey = new Map(all.map((entry) => [entry.key, entry]));
  const keys = args.batch ? readJson(BATCHES, `${args.batch}.json`).keys : rest;
  if (keys.length === 0) return fail('照合する key が 0 件（--batch か key を渡す）', 2);
  const overrides = loadTableOverrides();
  const asApproved = (entry) => entry && { ...entry, review: { ...(entry.review ?? {}), status: 'approved' } };
  // absorbs は同じ文書・章でそれより前の版面だけを取り込める
  const earlier = (source) =>
    new Map(
      all
        .filter((e) => source && e.document === source.document && e.chapterId === source.chapterId && e.key !== source.key && e.pages[0] <= source.pages[source.pages.length - 1])
        .map((e) => [e.key, e.body]),
    );
  mkdirSync(PREVIEW, { recursive: true });
  let ok = 0;
  let ng = 0;
  for (const key of keys) {
    const source = byKey.get(key);
    const entry = overrides.get(key);
    if (!entry) { console.log(`✗ ${key}: 組み直しのファイルが無い`); ng += 1; continue; }
    if (tableKey(entry.layout ?? []) !== key) { console.log(`✗ ${key}: layout のハッシュが key と違う（layout は版面の行をそのまま写す）`); ng += 1; continue; }
    const applied = applyTableOverride(source?.body ?? entry.layout, asApproved(entry), {
      lookup: (ref) => asApproved(overrides.get(ref)),
      absorbedBodies: earlier(source),
    });
    if (!applied.ok) { console.log(`✗ ${key}: ${applied.reason} ${applied.detail ?? ''}`); ng += 1; continue; }
    const lines = [`# ${key}（${entry.kind ?? 'parts'}・${entry.review?.status ?? 'no-review'}）`, '', `キャプション（版面の外）: ${(source?.caption ?? []).map((c) => c.trim()).join(' ') || 'なし'}`, ''];
    for (const part of applied.parts ?? []) {
      if (part.kind === 'table') {
        const row = (cells) => `| ${cells.join(' | ')} |`;
        lines.push(row(part.header[0]), `| ${part.header[0].map(() => '---').join(' | ')} |`, ...part.header.slice(1).map((r) => row(r.map((c) => (c ? `**${c}**` : c)))), ...part.rows.map(row));
      } else if (part.kind === 'list') lines.push(...part.items.map((item) => `- ${item}`));
      else if (part.kind === 'verbatim') lines.push('```text', ...part.lines, '```');
      else lines.push(part.kind === 'caption' ? `**${part.text}**` : part.text);
      lines.push('');
    }
    if (applied.kind === 'absorbed') lines.push(`（${applied.into} に取り込まれる。ここには何も出ない）`);
    lines.push('', '版面:', '```text', ...(source?.body ?? entry.layout), '```', '');
    writeFileSync(join(PREVIEW, `${key}.md`), lines.join('\n'));
    console.log(`✓ ${key}: ${applied.kind === 'parts' ? applied.parts.map((p) => (p.kind === 'table' ? `table ${p.header[0].length}列×${p.rows.length}行` : p.kind)).join(' + ') : applied.kind} → ${join(PREVIEW, `${key}.md`)}`);
    // 文書ごとの差し替え（documentVariants）も、その文書で使う形にして同じく照合し、確認用の表を別に書く
    let variantNg = false;
    for (const doc of Object.keys(entry.documentVariants ?? {})) {
      const variant = loadTableOverrides(doc).get(key);
      const v = applyTableOverride(source?.body ?? entry.layout, asApproved(variant), { lookup: (ref) => asApproved(overrides.get(ref)), absorbedBodies: earlier(source) });
      if (!v.ok) { console.log(`✗ ${key} [${doc}]: ${v.reason} ${v.detail ?? ''}`); variantNg = true; continue; }
      const out = [`# ${key} の差し替え（${doc}）`, '', `前の段落: ${(variant.absorbsParagraphs?.before ?? []).join(' ／ ') || 'なし'}`, `後ろの段落: ${(variant.absorbsParagraphs?.after ?? []).join(' ／ ') || 'なし'}`, ''];
      for (const part of v.parts ?? []) {
        if (part.kind === 'table') out.push(...[...part.header, ...part.rows].map((cells) => `| ${cells.join(' | ')} |`));
        else if (part.kind === 'list') out.push(...part.items.map((item) => `- ${item}`));
        else if (part.kind === 'verbatim') out.push('```text', ...part.lines, '```');
        else out.push(part.text);
        out.push('');
      }
      const file = `${key}--${doc.replace('/', '-')}.md`;
      writeFileSync(join(PREVIEW, file), out.join('\n'));
      console.log(`✓ ${key} [${doc}] 差し替え → ${join(PREVIEW, file)}`);
    }
    if (variantNg) { ng += 1; continue; }
    ok += 1;
  }
  console.log(`[standards-tables] 合格 ${ok} / 不合格 ${ng} / 対象 ${keys.length}`);
  if (ng > 0) process.exitCode = 1;
}

// ---- 判定の記録 ---------------------------------------------------------

function review() {
  const [key] = rest;
  if (!key || !['approved', 'rejected'].includes(args.status)) return fail('review <key> --status approved|rejected --note "…"', 2);
  const path = join(TABLE_OVERRIDES_ROOT, `${key}.json`);
  if (!existsSync(path)) return fail(`組み直しのファイルが無い: ${path}`, 2);
  const entry = JSON.parse(readFileSync(path, 'utf8'));
  const previous = entry.review?.note ? `${entry.review.note} ／ ` : '';
  entry.review = { status: args.status, by: 'qa', at: new Date().toISOString(), note: `${previous}QA: ${args.note}` };
  writeJson(TABLE_OVERRIDES_ROOT, `${key}.json`, entry);
  console.log(`[standards-tables] ${key}: ${args.status}`);
}

const commands = { inventory, sheets, validate, review, render };
if (!commands[command]) fail(`使い方: npm run standards-tables -- <${Object.keys(commands).join('|')}> …`, 2);
else commands[command]();
