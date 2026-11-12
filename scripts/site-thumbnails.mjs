#!/usr/bin/env node
/**
 * サイト内サムネイルの三段の分担を 1 コマンドで進める。途中で止まっても、再実行で続きから動く。
 *   node scripts/site-thumbnails.mjs --exam civil-construction-1
 * 1. 台帳（未記入のページの帯の文字と絵の題材を Codex が書く）
 * 2. 生成（未生成・画風の版が古い絵を Codex で作る）
 * 3. 機械検査（同一の画像・似た題材）
 * 4. 一次監査（未判定の絵を Codex が判定する）
 * 5. Claude の確認リストを .tmp/site-thumbs/<資格>/claude-queue.json へ書く
 * --fix-fails: Codex が fail とした絵の指示へ指摘を足して作り直す（Claude を使わない修正）
 * --record <JSON>: 二次監査の結果 [{key, verdict, reason}] を台帳へ書き、一次監査だけの ok も確定する
 * exit: 0 完了 / 1 失敗 / 2 検査不成立（全件の判定が返らない）
 *
 * npm run site-thumbs -- --exam <資格> — サイト内サムネイルの三段の分担（Codex の台帳→生成→機械検査→Codex 一次監査→Claude の確認リスト）。途中で止まっても再実行で続きから動く。--fix-fails は Codex の不合格を指摘つきで作り直す、--record <JSON> は二次監査の結果を台帳へ書く。設計は docs/operations/画像運用設計.md。長時間なのでセッションから切り離して動かす
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { askCodexAboutImages } from './lib/codex-image.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { checkLedger, claudeQueue, loadLedger, recordKey, recordVerdicts, saveLedger, similarScenes, stalePages } from './lib/site-thumbnails-pipeline.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const { values: args } = parseArgs({ options: { exam: { type: 'string' }, label: { type: 'string' }, model: { type: 'string' }, 'fix-fails': { type: 'boolean' }, record: { type: 'string' } } });
const exam = args.exam;
if (!exam) throw new Error('--exam が要る');
const configPath = join(ROOT, datasetPath('config.site-thumbnails'));
const imagePath = (key) => join(ROOT, 'content/site', exam, key, readConfig().imageFile);
const work = join(ROOT, '.tmp/site-thumbs', exam);
mkdirSync(join(work, 'png'), { recursive: true });
const readConfig = () => JSON.parse(readFileSync(configPath, 'utf8'));
const saveJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

function articles() {
  const dir = join(ROOT, 'content/site', exam);
  return readdirSync(dir).flatMap((key) => {
    const file = join(dir, key, 'article.mdx');
    if (!existsSync(file)) return [];
    const head = readFileSync(file, 'utf8').replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    if (/^published:\s*false/m.test(head)) return [];
    const field = (name) => head.match(new RegExp(`^${name}:\\s*"?([^"\\n]*)`, 'm'))?.[1]?.trim() ?? '';
    return [{ key, title: field('title'), shortTitle: field('shortTitle'), subtitle: field('subtitle'), group: field('group') }];
  });
}

const parseArray = (text) => { try { return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { return null; } };

async function writeLedger(rows, rules) {
  const part = async (input) => {
    let last = { rows: [], missing: input.map((row) => row.key), tooLong: [] };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const prompt = `${args.label ?? exam}の記事サムネイルの台帳を書いてください。ファイルは読まないでください。\n${rules}\n\n入力:\n${JSON.stringify(input)}\n\nJSON 配列だけを返してください: [{"key":"…","text":"…","scene":"…"}]`;
      last = checkLedger(input, parseArray(await askCodexAboutImages(prompt, [], { model: args.model ?? null })));
      if (!last.missing.length && !last.tooLong.length) break;
    }
    return last.rows.filter((row) => !last.tooLong.includes(row.key));
  };
  const size = 25;
  const parts = [];
  for (let i = 0; i < rows.length; i += size) parts.push(rows.slice(i, i + size));
  const out = [];
  for (let i = 0; i < parts.length; i += 3) out.push(...(await Promise.all(parts.slice(i, i + 3).map(part))).flat());
  return out;
}

if (args.record) {
  const reviewed = JSON.parse(readFileSync(join(work, 'codex-review.json'), 'utf8'));
  const claude = JSON.parse(readFileSync(args.record, 'utf8'));
  const seen = new Set(claude.map((row) => row.key));
  const ledger = loadLedger(ROOT);
  const now = new Date().toISOString();
  recordVerdicts(ledger, exam, claude, 'codex+ai-image-fidelity-auditor', now);
  recordVerdicts(ledger, exam, reviewed.filter((row) => !seen.has(row.key) && row.verdict === 'ok' && ledger.figures[recordKey(exam, row.key)]?.verdict == null), 'codex', now);
  saveLedger(ROOT, ledger);
  // 二次監査の不合格は、指摘を題材へ足して版を外し、次の実行で作り直す（--fix-fails の Claude 版）
  const fails = claude.filter((row) => row.verdict === 'fail');
  if (fails.length) {
    const config = readConfig();
    for (const row of fails) {
      const page = config.pages[exam][row.key];
      page.scene = `${page.scene.split(' 前回の問題:')[0]} 前回の問題: ${row.reason}。これを避ける。`;
      delete page.version;
    }
    saveJson(configPath, config);
  }
  console.log(`記録: 二次 ${claude.length} 件（不合格 ${fails.length} 件は作り直しの対象にした）`);
  process.exit(0);
}

if (args['fix-fails']) {
  const reviewPath = join(work, 'codex-review.json');
  const reviewed = JSON.parse(readFileSync(reviewPath, 'utf8'));
  const config = readConfig();
  const fails = reviewed.filter((row) => row.verdict === 'fail');
  for (const row of fails) {
    const page = config.pages[exam][row.key];
    page.scene = `${page.scene.split(' 前回の問題:')[0]} 前回の問題: ${row.reason}。これを避ける。`;
    delete page.version;
  }
  saveJson(configPath, config);
  saveJson(reviewPath, reviewed.filter((row) => row.verdict !== 'fail'));
  console.log(`作り直しの対象 ${fails.length} 件`);
}

// 1. 台帳
const all = articles();
if (!all.length) { console.error('対象 0 件'); process.exit(2); }
{
  const config = readConfig();
  const pages = config.pages[exam] ?? {};
  const pending = all.filter((row) => !pages[row.key]);
  if (pending.length) {
    const rows = await writeLedger(pending, config.ledgerRules);
    for (const row of rows) pages[row.key] = { text: row.text, scene: row.scene };
    config.pages[exam] = pages;
    saveJson(configPath, config);
    console.log(`台帳 ${rows.length} / ${pending.length} 件`);
    if (rows.length !== pending.length) { console.error('台帳が書けなかった行がある'); process.exit(1); }
  }
}

// 2. 生成
const generated = spawnSync(process.execPath, [join(ROOT, 'scripts/generate-site-thumbnails.mjs'), '--exam', exam, '--pages'], { stdio: 'inherit' });
{
  const config = readConfig();
  const stale = stalePages(config.pages[exam], loadLedger(ROOT), exam, config.styleVersion);
  if (stale.length) { console.error(`未生成 ${stale.length} 件（exit ${generated.status}）。再実行で続きから作る`); process.exit(1); }
}

// 3. 機械検査
const config = readConfig();
const pages = config.pages[exam];
const rows = all.map((row) => ({ ...row, ...pages[row.key] }));
const digests = new Map();
const sameImages = [];
for (const row of rows) {
  const digest = createHash('sha256').update(readFileSync(imagePath(row.key))).digest('hex');
  if (digests.has(digest)) sameImages.push([digests.get(digest), row.key]);
  digests.set(digest, row.key);
}
const similarPairs = similarScenes(rows, config.review.similarScene);
console.log(`機械検査: ${rows.length} 件 / 同一の画像 ${sameImages.length} 組 / 似た題材 ${similarPairs.length} 組`);
if (sameImages.length) { console.error(`同一の画像: ${JSON.stringify(sameImages)}`); process.exit(1); }

// 4. 一次監査
const ledger = loadLedger(ROOT);
const unreviewed = rows.filter((row) => ledger.figures[recordKey(exam, row.key)]?.verdict == null);
const reviewPath = join(work, 'codex-review.json');
const known = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, 'utf8')) : [];
const reviewed = new Map(known.map((row) => [row.key, row]));
const todo = unreviewed.filter((row) => !reviewed.has(row.key));
if (todo.length) {
  const input = await Promise.all(todo.map(async (row) => {
    const image = join(work, 'png', `${row.key}.png`);
    await sharp(imagePath(row.key)).png().toFile(image);
    return { key: row.key, image, text: row.text, scene: row.scene, title: row.title };
  }));
  const inputPath = join(work, 'codex-input.json');
  const outPath = join(work, 'codex-out.json');
  saveJson(inputPath, input);
  spawnSync(process.execPath, [join(ROOT, 'scripts/review-site-thumbnails.mjs'), '--input', inputPath, '--out', outPath], { stdio: 'inherit' });
  for (const row of existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : []) reviewed.set(row.key, row);
  saveJson(reviewPath, [...reviewed.values()]);
}

// 5. Claude の確認リスト
const target = unreviewed.map((row) => ({ key: row.key, image: join(work, 'png', `${row.key}.png`), text: row.text, scene: row.scene, title: row.title, subtitle: row.subtitle, group: row.group }));
const queue = claudeQueue(target, [...reviewed.values()], similarPairs, config.review);
saveJson(join(work, 'claude-queue.json'), queue);
const missing = target.filter((row) => !reviewed.has(row.key)).length;
const count = (reason) => queue.filter((row) => row.reasons.some((item) => item.startsWith(reason))).length;
console.log(`一次監査 ${target.length - missing} / ${target.length} 件 / Claude の確認 ${queue.length} 件（Codex ${count('codex')}・高リスク ${count('risk')}・似た題材 ${count('similar')}・抜き取り ${count('sample')}）`);
process.exit(missing ? 2 : 0);
