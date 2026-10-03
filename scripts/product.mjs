#!/usr/bin/env node
/**
 * product.mjs — 商品の正本（content/products/）を扱う CLI（DN-0492）。正本は直接手で書かず、これで読み書きする。
 * ---------------------------------------------------------------------------
 * 使い方:
 *   npm run product -- list [--qualification <id>] [--tier pack|magazine|single]   # 一覧（id・層・系列・価格・収録数）
 *   npm run product -- show <id>                                                   # 1 商品の正本を表示
 *   npm run product -- set <id> <path> <json値>                                     # 例: set civil-2-x catalog.price '"¥2,480（8工事セット）"'
 *   npm run product -- add-member <id> <article.md> [...]  / remove-member <id> <article.md> [...]
 *   npm run product -- fmt                                                          # 全ファイルを正規化して書き直す
 *   npm run product -- gen [--check]                                                # note-magazines.ts の生成ブロックを書く（--check は差分で exit 1）
 *   npm run product -- import-note --qualification <id> [--commit]                  # 現行の note-magazines.ts と note の収録から正本を作る（移行用・既定 dry-run）
 * exit: 0 成功 / 1 検査・差分・書き込み失敗 / 2 引数不正
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tsImport } from 'tsx/esm/api';
import {
  ROOT, NOTE_MAGAZINES_TS, SNAPSHOT, GROUPS, Product, loadProducts, saveProduct, canonicalJson, productPath,
  renderBlock, replaceBlock, BLOCK_BEGIN, BLOCK_END, noteKeyOf, singleKeyOf,
} from './lib/product-registry.mjs';
import { loadLineupConfig, classifyProduct } from './lib/product-lineup.mjs';
import { listFiles } from './lib/fs-walk.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (k) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const die = (msg, code = 2) => {
  console.error(`[product] ${msg}`);
  process.exit(code);
};

function byIdOrDie(id) {
  const { products, errors } = loadProducts();
  if (errors.length) die(`正本に問題がある（npm run check-products）:\n  ${errors.join('\n  ')}`, 1);
  const p = products.find((x) => x.id === id);
  if (!p) die(`商品が無い: ${id}`, 1);
  return p;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof cur[k] !== 'object' || cur[k] === null) die(`パスが無い: ${path}`);
    cur = cur[k];
  }
  cur[keys.at(-1)] = value;
}

/** note-magazines.ts の全エントリ（tsx でそのまま読む）とエントリ直前のコメント行 */
async function readCatalog() {
  const mod = await tsImport(NOTE_MAGAZINES_TS, import.meta.url);
  const all = mod.NOTE_MAGAZINES;
  const ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
  const lines = ts.split('\n');
  const memo = new Map();
  lines.forEach((l, i) => {
    const m = l.match(/^ {2}'([a-z0-9-]+)': \{$/);
    if (!m) return;
    const out = [];
    for (let j = i - 1; j >= 0 && /^ {2}\/\/ /.test(lines[j]); j--) out.unshift(lines[j].replace(/^ {2}\/\/ /, ''));
    memo.set(m[1], out);
  });
  return { all, memo };
}

/** content/note の記事: noteId → リポジトリ相対パス */
function articleIndex() {
  const idx = new Map();
  for (const p of listFiles(join(ROOT, 'content', 'note'), { followLinks: true, match: (_p, name) => /^article(-[^/\\]+)?\.md$/.test(name) })) {
    const raw = readFileSync(p, 'utf8');
    const id = raw.match(/^noteId:\s*"?(n[0-9a-f]+)"?\s*$/m)?.[1] ?? raw.match(/^noteUrl:\s*"?https:\/\/note\.com\/[^/]+\/n\/(n[0-9a-f]+)/m)?.[1];
    if (id && !idx.has(id)) idx.set(id, relative(ROOT, p).split('\\').join('/'));
  }
  return idx;
}

const SERIES_RULES = [
  [/gakka|anki/, 'gakka'],
  [/takuitsu|reading-guide/, 'first'],
  [/marugoto|chokuzen|r8-bunseki/, 'cross'],
  [/keiken|essay|koji-bank|small-infra|mock3/, 'keiken'],
];

async function importNote() {
  const q = arg('--qualification');
  if (!q) die('--qualification が要る');
  const commit = argv.includes('--commit');
  const config = loadLineupConfig();
  const { all, memo } = await readCatalog();
  const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const live = new Map(snap.magazines.map((m) => [m.key, (m.notes ?? []).map((n) => n.key)]));
  const articles = articleIndex();

  // 複数の資格にまたがる商品（会員プランなど）は資格のグループに入れない（段階1の対象外）
  const qualsOf = (id) => new Set((classifyProduct(config.rules?.note, id) ?? []).map((c) => c.split(':')[0]));
  const picked = Object.values(all).filter((m) => { const qs = qualsOf(m.id); return qs.size === 1 && qs.has(q); });
  if (!picked.length) die(`対象 0 件（${q}）。product-lineup.json の rules.note を確かめる`, 1);
  // 収録（live）から、マガジン同士の包含で層と includes を決める
  const sets = new Map(picked.map((m) => [m.id, new Set(live.get(noteKeyOf(m.noteUrl)) ?? [])]));
  const contains = (a, b) => b.size > 0 && a.size > b.size && [...b].every((k) => a.has(k));
  const out = [];
  for (const m of picked) {
    const cell = (classifyProduct(config.rules.note, m.id) ?? []).find((c) => c.startsWith(`${q}:`));
    const single = singleKeyOf(m.noteUrl);
    const mine = sets.get(m.id);
    const inner = picked.filter((o) => o.id !== m.id && contains(mine, sets.get(o.id)));
    const direct = inner.filter((o) => !inner.some((mid) => mid.id !== o.id && contains(sets.get(mid.id), sets.get(o.id))));
    // 単品 SKU（/n/）が丸ごと含まれる場合も includes にする
    const singleSkus = picked.filter((o) => o.id !== m.id && singleKeyOf(o.noteUrl) && mine.has(singleKeyOf(o.noteUrl)));
    const covered = new Set([...direct.flatMap((o) => [...sets.get(o.id)]), ...singleSkus.map((o) => singleKeyOf(o.noteUrl))]);
    const members = [...mine].filter((k) => !covered.has(k)).map((k) => articles.get(k) ?? `?${k}`);
    const tier = m.retiredAt ? 'magazine' : single ? 'single' : !m.priceStr && /会員/.test(m.price ?? '') ? 'membership' : inner.length ? 'pack' : 'magazine';
    const p = {
      id: m.id,
      channel: 'note',
      qualification: q,
      stage: cell.split(':')[1],
      series: SERIES_RULES.find(([re]) => re.test(m.id))?.[1] ?? 'other',
      tier: /会員/.test(String(m.price ?? '')) ? 'membership' : tier,
      persona: null,
      catalog: m,
      members: members.sort(),
      includes: [...direct.map((o) => o.id), ...singleSkus.map((o) => o.id)].sort(),
      memo: memo.get(m.id) ?? [],
    };
    const parsed = Product.safeParse(p);
    if (!parsed.success) die(`${m.id}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' / ')}`, 1);
    out.push(parsed.data);
  }
  const unknown = out.flatMap((p) => p.members.filter((x) => x.startsWith('?')).map((x) => `${p.id}: ${x}`));
  for (const p of out) console.log(`${p.tier.padEnd(10)} ${p.series.padEnd(7)} ${p.id}  members=${p.members.length} includes=${p.includes.length}`);
  if (unknown.length) console.log(`[product] 原稿が見つからない収録 ${unknown.length} 件:\n  ${unknown.join('\n  ')}`);
  if (!commit) return console.log(`[product] dry-run: ${out.length} 件（--commit で content/products/note/ へ書く）`);
  for (const p of out) saveProduct(p);
  console.log(`[product] ${out.length} 件を書いた。次に gen でブロックを作る（初回は --init-block）`);
}

/** 初回: note-magazines.ts から対象エントリ（とその直前のコメント）を抜き、最初の位置に生成ブロックの枠を置く */
function initBlock(group, ids) {
  let ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
  if (ts.includes(BLOCK_BEGIN(group))) return ts;
  const lines = ts.split('\n');
  const drop = new Set();
  let first = -1;
  lines.forEach((l, i) => {
    const m = l.match(/^ {2}'([a-z0-9-]+)': \{$/);
    if (!m || !ids.has(m[1])) return;
    let s = i;
    while (s > 0 && /^ {2}\/\/ /.test(lines[s - 1])) s--;
    let e = i;
    while (e < lines.length && lines[e] !== '  },') e++;
    for (let k = s; k <= e; k++) drop.add(k);
    if (first < 0 || s < first) first = s;
  });
  if (first < 0) die(`note-magazines.ts に対象エントリが無い（${group}）`, 1);
  const out = [];
  lines.forEach((l, i) => {
    if (i === first) out.push(BLOCK_BEGIN(group), BLOCK_END(group));
    if (!drop.has(i)) out.push(l);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function gen() {
  const check = argv.includes('--check');
  const { products, errors } = loadProducts();
  if (errors.length) die(`正本に問題がある:\n  ${errors.join('\n  ')}`, 1);
  let ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
  for (const [group, pick] of Object.entries(GROUPS)) {
    const mine = products.filter(pick);
    if (!mine.length) continue;
    if (!ts.includes(BLOCK_BEGIN(group))) {
      if (check) die(`生成ブロックが無い（${group}）。npm run product -- gen を実行する`, 1);
      writeFileSync(NOTE_MAGAZINES_TS, initBlock(group, new Set(mine.map((p) => p.id))));
      ts = readFileSync(NOTE_MAGAZINES_TS, 'utf8');
    }
    const next = replaceBlock(ts, group, renderBlock(group, mine));
    if (next === null) die(`生成ブロックの枠が壊れている（${group}）`, 1);
    if (check && next !== ts) die(`note-magazines.ts の生成ブロックが正本と違う（${group}）。npm run product -- gen を実行する`, 1);
    ts = next;
    console.log(`[product] ${group}: ${mine.length} 件`);
  }
  if (!check) writeFileSync(NOTE_MAGAZINES_TS, ts);
}

switch (cmd) {
  case 'list': {
    const { products, errors } = loadProducts();
    const q = arg('--qualification');
    const t = arg('--tier');
    for (const p of products.filter((x) => (!q || x.qualification === q) && (!t || x.tier === t))) {
      console.log(`${p.tier.padEnd(10)} ${p.series.padEnd(7)} ${String(p.catalog.price ?? '').slice(0, 14).padEnd(14)} m=${String(p.members.length).padStart(3)} i=${p.includes.length}  ${p.id}`);
    }
    if (errors.length) die(`正本に問題 ${errors.length} 件（npm run check-products）`, 1);
    break;
  }
  case 'show':
    process.stdout.write(canonicalJson(byIdOrDie(argv[1] ?? die('id が要る'))));
    break;
  case 'set': {
    const [, id, path, json] = argv;
    if (!id || !path || json === undefined) die('使い方: set <id> <path> <json値>');
    const p = byIdOrDie(id);
    let value;
    try {
      value = JSON.parse(json);
    } catch {
      die(`値が JSON でない: ${json}`);
    }
    setPath(p, path, value);
    console.log(`[product] ${relative(ROOT, saveProduct(p))}`);
    break;
  }
  case 'add-member':
  case 'remove-member': {
    const [, id, ...paths] = argv;
    if (!id || !paths.length) die(`使い方: ${cmd} <id> <article.md> [...]`);
    const p = byIdOrDie(id);
    for (const path of paths) {
      const rel = path.split('\\').join('/').replace(/^\.\//, '');
      if (cmd === 'add-member') {
        if (!existsSync(join(ROOT, rel))) die(`記事が無い: ${rel}`, 1);
        if (!p.members.includes(rel)) p.members.push(rel);
      } else p.members = p.members.filter((x) => x !== rel);
    }
    p.members.sort();
    console.log(`[product] ${relative(ROOT, saveProduct(p))}  members=${p.members.length}`);
    break;
  }
  case 'fmt': {
    const { products, errors } = loadProducts();
    for (const p of products) writeFileSync(productPath(p.channel, p.id), canonicalJson(p));
    console.log(`[product] ${products.length} 件を正規化（型エラー ${errors.filter((e) => !/正規化/.test(e)).length} 件は書き直していない）`);
    break;
  }
  case 'gen':
    gen();
    break;
  case 'import-note':
    await importNote();
    break;
  default:
    die('使い方: list | show | set | add-member | remove-member | fmt | gen [--check] | import-note --qualification <id> [--commit]');
}
