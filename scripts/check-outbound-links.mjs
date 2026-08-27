#!/usr/bin/env node
/**
 * check-outbound-links.mjs — 自分のコンテンツから外へ出す**送客先**が生きているかを実査する。
 *
 * 背景（DN-0004 #4）: 送客先の状態を見る検査は X の「計画」（check-x-campaign-plan）だけで、
 *   実際に読者が踏むリンクの生死は誰も確かめていなかった。
 *   `/docs/` 宛は check-sns-urls が slug 実在を見ているが、**note.com 宛は無検査**。
 *   note 記事を下書きへ戻す・削除する・マガジンを組み替える、はいずれも普通に起きる操作なので、
 *   ファネルの途中が黙って切れる。
 *
 * 対象: content/{site,note,sns,coconala} の `note.com/{user}/n/{key}` と `/m/{magazine}`。
 * 取得は scripts/lib/note-api.mjs（唯一の入口。URL・エンドポイントの罠はそちらに集約）。
 *
 * **計測不能を FAIL と呼ばない**（note-live-check.mjs の isUnmeasurable と同じ姿勢）:
 *   取得失敗（プロキシ・レート制限・タイムアウト）は dead ではない。取得失敗が支配的なら
 *   「検査不成立」で exit 1 にし、緑を返さない。実検査数は常に出す。
 *
 * Usage:
 *   node scripts/check-outbound-links.mjs                 # 全件
 *   node scripts/check-outbound-links.mjs --limit 60      # 先頭 N 件（デバッグ）
 *   node scripts/check-outbound-links.mjs --scope note    # site|note|sns|coconala に絞る
 *   node scripts/check-outbound-links.mjs --json
 * exit: 0 合格 / 1 死んだ送客先あり・検査不成立
 */
import { readFileSync, readdirSync, existsSync, writeSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNote, fetchMagazine } from './lib/note-api.mjs';
import { extractNoteRefs } from './lib/note-refs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'check-outbound-links';
const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const LIMIT = Number(arg('--limit', '0')) || 0;
const SCOPE = arg('--scope');
const JSON_OUT = argv.includes('--json');
const THROTTLE_MS = 220;
const MAX_FETCH_FAIL_RATE = 0.2;

const SCOPES = ['site', 'note', 'sns', 'coconala'];
const toPosix = (p) => p.split(sep).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEXT_EXT = /\.(md|mdx|txt|json|ts|tsx)$/;
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('_archive')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && TEXT_EXT.test(e.name)) out.push(p);
  }
  return out;
}

// url -> Set(参照元ファイル)
const refs = new Map();
for (const s of SCOPES) {
  if (SCOPE && s !== SCOPE) continue;
  for (const abs of walk(join(ROOT, 'content', s))) {
    const rel = toPosix(abs.slice(ROOT.length + 1));
    const src = readFileSync(abs, 'utf8');
    for (const { kind, id } of extractNoteRefs(src)) {
      const key = `${kind}:${id}`;
      if (!refs.has(key)) refs.set(key, new Set());
      refs.get(key).add(rel);
    }
  }
}

let targets = [...refs.keys()].sort();
const declared = targets.length;
if (LIMIT) targets = targets.slice(0, LIMIT);

// 逐次 + THROTTLE_MS で回すと 876 件で 7分20秒かかり、quality-audit の ci ゲート予算
// （420秒）を僅かに超えてフラップする（2026-08-25 実測）。8 並列で 4分23秒まで縮む。
// **16 並列は試したら逆に悪化した**（5分でも1件も終わらず timeout・会社 PC のプロキシが
// 同時接続を絞っているとみられる）。数を増やせば速くなるとは限らないので、上げるときは
// 実測してから変えること。
// 2026-08-27 再実測: 877 件 / 235 秒 / 取得失敗 0（timeout 600 秒に対し 2.5 倍の余裕）。
const CONCURRENCY = 8;
const dead = [];
let alive = 0; let unknown = 0;
let cursor = 0;
async function worker() {
  while (cursor < targets.length) {
    const key = targets[cursor]; cursor += 1;
    const [kind, id] = key.split(':');
    const r = kind === 'n' ? await fetchNote(id) : await fetchMagazine(id);
    if (r.state === 'alive' || r.state === 'unmeasurable') alive += 1;
    else if (r.state === 'unknown') unknown += 1;
    else dead.push({ url: `note.com/…/${kind}/${id}`, detail: (r.error || '').slice(0, 40), refs: [...refs.get(key)].slice(0, 3), refCount: refs.get(key).size });
    await sleep(THROTTLE_MS);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

const inspected = targets.length - unknown;
const summary = `[${NAME}] 送客先 ${declared} 件（うち走査 ${targets.length}）→ 実検査 ${inspected}`
  + ` / 生存 ${alive} / 切れ ${dead.length} / 取得失敗 ${unknown}`;

if (JSON_OUT) {
  writeSync(1, `${JSON.stringify({ declared, scanned: targets.length, inspected, alive, unknown, dead }, null, 2)}\n`);
  process.exit(dead.length ? 1 : 0);
}

console.log(summary);
if (declared === 0) {
  console.error(`[${NAME}] ✗ 検査不成立: 送客先 URL が 1 件も見つからない。0 件を「異常なし」と読まない。`);
  process.exit(1);
}
if (targets.length && unknown / targets.length > MAX_FETCH_FAIL_RATE) {
  console.error(`[${NAME}] ✗ 検査不成立: ${targets.length} 件中 ${unknown} 件が取得できず`
    + `（${Math.round((unknown / targets.length) * 100)}%）。取得失敗は「生きている」ではない。`);
  process.exit(1);
}
if (dead.length === 0) {
  console.log(`[${NAME}] ✓ 実検査 ${inspected} 件すべて生存`);
  process.exit(0);
}
console.error(`\n切れている送客先 ${dead.length} 件（削除・下書き戻し・非公開のいずれか。API では区別できない）:`);
for (const d of dead.slice(0, 30)) {
  console.error(`  ${d.url}  (${d.detail})  ← ${d.refCount} 箇所から参照`);
  for (const r of d.refs) console.error(`      ${r}`);
}
if (dead.length > 30) console.error(`  … ほか ${dead.length - 30} 件`);
process.exit(1);
