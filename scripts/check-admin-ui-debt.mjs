#!/usr/bin/env node
/**
 * check-admin-ui-debt.mjs — 管理画面のページに残る「生のカード」と「インライン style」をラチェットで減らす
 * ---------------------------------------------------------------------------
 * なぜ必要か（DN-0432）:
 *   管理画面のページは globals.css の .card と style={{…}} を直接書いてきた。余白を `.card + .card`
 *   （直後がカードのときだけ）で決めていたため、間に別の箱が入るとカード同士がくっついた（PR #684）。
 *   shadcn/ui の部品（components/ui/*）とレイアウト部品（components/layout.tsx）へ移すにあたり、
 *   移行済みのページに生の書き方が戻らないよう、ページごとの件数を基準値として固定する。
 *
 * 数えるもの（tools/admin-app/src/app/ 配下の .tsx）:
 *   rawCard      className に単語 "card" を含む（"card" / "card warn-border" など。"card-grid" 等は数えない）
 *   inlineStyle  style={{ の出現
 *
 * 判定:
 *   基準値（.claude/config/admin-ui-debt-baseline.json）より増えたページがあれば exit 1。
 *   基準値に無いページ（新規）は 0 件でなければ exit 1。減ったページは info で知らせる（--update で基準値を下げる）。
 *   対象ファイルが 0 件なら exit 2（検査不成立）。
 *
 * 使い方:
 *   node scripts/check-admin-ui-debt.mjs            # 検査
 *   node scripts/check-admin-ui-debt.mjs --update   # 今の件数で基準値を書き直す（減らしたときだけ使う）
 *   node scripts/check-admin-ui-debt.mjs --json
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const APP_DIR = join(ROOT, 'tools/admin-app/src/app');
const BASELINE = join(ROOT, '.claude/config/admin-ui-debt-baseline.json');
const TAG = '[check-admin-ui-debt]';

const RE_CLASSNAME = /className=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
const RE_STYLE = /style=\{\{/g;

/** ソース 1 本の件数を数える（テストから使う純関数）。 */
export function countDebt(src) {
  let rawCard = 0;
  for (const m of src.matchAll(RE_CLASSNAME)) {
    const cls = (m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/);
    if (cls.includes('card')) rawCard++;
  }
  const inlineStyle = (src.match(RE_STYLE) || []).length;
  return { rawCard, inlineStyle };
}

/** 基準値と比べる（テストから使う純関数）。 */
export function compare(current, baseline) {
  const regressions = [];
  const improvements = [];
  for (const [file, now] of Object.entries(current)) {
    const base = baseline[file] ?? { rawCard: 0, inlineStyle: 0 };
    for (const key of ['rawCard', 'inlineStyle']) {
      if (now[key] > base[key]) regressions.push({ file, key, base: base[key], now: now[key], isNew: !(file in baseline) });
      else if (now[key] < base[key]) improvements.push({ file, key, base: base[key], now: now[key] });
    }
  }
  return { regressions, improvements };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const files = existsSync(APP_DIR) ? walk(APP_DIR) : [];
  if (!files.length) {
    console.error(`${TAG} 検査不成立: ${relative(ROOT, APP_DIR)} に .tsx が 1 件も無い`);
    return 2;
  }
  const current = {};
  for (const f of files) {
    const c = countDebt(readFileSync(f, 'utf8'));
    if (c.rawCard || c.inlineStyle) current[relative(ROOT, f).split(sep).join('/')] = c;
  }
  const totals = Object.values(current).reduce((a, c) => ({ rawCard: a.rawCard + c.rawCard, inlineStyle: a.inlineStyle + c.inlineStyle }), { rawCard: 0, inlineStyle: 0 });

  if (argv.includes('--update')) {
    const doc = {
      _comment: 'check-admin-ui-debt のラチェット基準値。ページごとの生 card クラスとインライン style の件数。増えたら CI が落ちる。shadcn 部品へ移して減らしたら `node scripts/check-admin-ui-debt.mjs --update` で下げる（DN-0432）。',
      _updatedAt: todayJst(),
      totals,
      files: Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))),
    };
    writeFileSync(BASELINE, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    console.log(`${TAG} 基準値を更新: ページ ${files.length} 本を実検査 / 生 card ${totals.rawCard} 件・インライン style ${totals.inlineStyle} 件`);
    return 0;
  }

  if (!existsSync(BASELINE)) {
    console.error(`${TAG} 検査不成立: 基準値 ${relative(ROOT, BASELINE)} が無い（--update で作る）`);
    return 2;
  }
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).files ?? {};
  const { regressions, improvements } = compare(current, baseline);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ checked: files.length, totals, regressions, improvements }, null, 2));
  } else {
    console.log(`${TAG} ページ ${files.length} 本を実検査 / 生 card ${totals.rawCard} 件・インライン style ${totals.inlineStyle} 件`);
    for (const r of regressions) {
      const what = r.key === 'rawCard' ? '生の card クラス' : 'インライン style';
      console.log(`  ✗ ${r.file}: ${what} ${r.base} → ${r.now}${r.isNew ? '（新規ページは 0 件にする）' : ''}`);
    }
    for (const i of improvements) {
      const what = i.key === 'rawCard' ? '生の card クラス' : 'インライン style';
      console.log(`  info ${i.file}: ${what} ${i.base} → ${i.now}（--update で基準値を下げる）`);
    }
    if (!regressions.length) console.log(`${TAG} ✓ 増えたページなし`);
    else console.log(`${TAG} components/ui/*（Card など）と components/layout.tsx（Stack / Grid / Section）を使う`);
  }
  return regressions.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
