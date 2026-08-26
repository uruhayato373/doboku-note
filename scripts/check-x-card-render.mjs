#!/usr/bin/env node
/**
 * check-x-card-render.mjs — X 投稿カード PNG の**中身**を、画像を開かずに検査する。
 *
 * 背景（DN-0004 #2）: 生成画像の色・文字を見る検査が 1 つも無かった。
 *   `content/sns/x/**\/img/*.png` は 100 枚規模あるのに、どの check も開いていない。
 *   `check-ogp-design` は輝度しか見ておらず、資格別テーマ色が正しいかは誰も確かめていない。
 *
 * 取れる手段は 3 つあった——OCR / 基準画像とのピクセル差分 / **生成時に構造化ログを吐いて
 * 画像でなくログを検査する**。3 つ目が一番安く、描画のすぐ横で記録するので SVG と食い違わない。
 * gen-x-card.mjs が `.claude/state/sns/x-card-render.json` へ「何色で何を描いたか」を残し、
 * 本スクリプトがそれを検査する。
 *
 * 検査:
 *   error  台帳に無い PNG がある（＝どの色で描かれたか誰も知らない画像）
 *   error  bg が exam-palette の deep と違う（試験別テーマ色のドリフト）
 *   error  keywordName / headerLabel が空（主題の無いカードが出ている）
 *   error  台帳にあるのに PNG が無い（削除もれ）
 *   warn   droppedLines > 0（本文が maxLines で切れている）
 *
 * **検査ゼロを PASS と呼ばない**: 対象数と実検査数を必ず出し、対象 0 件は exit 1。
 *
 * Usage:
 *   node scripts/check-x-card-render.mjs
 *   node scripts/check-x-card-render.mjs --json
 * exit: 0 合格 / 1 違反・検査不成立
 */
import { readFileSync, existsSync, readdirSync, statSync, writeSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { examColor } from '../.claude/scripts/sns/lib/exam-palette.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, '.claude/state/sns/x-card-render.json');
const X_DIR = join(ROOT, 'content/sns/x');
const JSON_OUT = process.argv.includes('--json');
const NAME = 'check-x-card-render';

const toPosix = (p) => p.split(sep).join('/');

function walkPngs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    // `_archive*` は旧アカウント時代の保管物。今後出す画像ではないので検査しない
    // （2026-08-25 実測: `_archive-old-account` の 78 枚が「台帳に無い」で全部 error になっていた）。
    if (e.isDirectory() && e.name.startsWith('_archive')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walkPngs(p, out);
    else if (e.isFile() && e.name.endsWith('.png') && toPosix(p).includes('/img/')) out.push(p);
  }
  return out;
}

const pngs = walkPngs(X_DIR).map((p) => toPosix(p.slice(ROOT.length + 1)));
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { entries: {} };
const entries = ledger.entries || {};

const errors = [];
const warnings = [];
let inspected = 0;

for (const rel of pngs) {
  const meta = entries[rel];
  if (!meta) {
    // 台帳に無い＝この画像がどの色・どの文字で描かれたか誰も知らない。--force で再生成すれば載る。
    errors.push({ rule: 'no-ledger', at: rel, msg: '描画台帳に無い（gen-x-card --force で再生成して台帳へ載せる）' });
    continue;
  }
  inspected += 1;
  if (!meta.keywordName) errors.push({ rule: 'empty-keyword', at: rel, msg: '主題（keywordName）が空のまま描画されている' });
  if (!meta.headerLabel) errors.push({ rule: 'empty-header', at: rel, msg: 'ヘッダラベルが空' });

  // 総監は管理分野色（tokens に無い）なので対象外。それ以外は exam-palette の deep と一致すること。
  if (meta.exam && meta.exam !== 'pe-comprehensive') {
    let want = null;
    try { want = examColor(meta.exam, 'deep').use; } catch { want = null; }
    if (want && meta.colors?.bg && meta.colors.bg.toLowerCase() !== want.toLowerCase()) {
      errors.push({ rule: 'color-drift', at: rel, msg: `bg=${meta.colors.bg} だが ${meta.exam} のテーマ色は ${want}` });
    }
  }
  // 生 URL の焼き込み。行頭 URL しか落としていなかった頃、UTM 付きリンクが本文に
  // 5 行ぶん描かれていた（総監カウントダウン 43 枚）。カードは要約であって URL 置き場ではない。
  if (/https?:\/\//.test(meta.body || '')) {
    errors.push({ rule: 'url-in-body', at: rel, msg: `本文に生 URL が焼き込まれている: ${(meta.body.match(/https?:\/\/\S{0,40}/) || [''])[0]}…` });
  }
  if (meta.droppedLines > 0) {
    warnings.push({ rule: 'text-truncated', at: rel, msg: `本文が ${meta.droppedLines} 行ぶん切れている（maxLines 超過）` });
  }
}

const stalePng = Object.keys(entries).filter((k) => !existsSync(join(ROOT, k)));
for (const k of stalePng) errors.push({ rule: 'ledger-orphan', at: k, msg: '台帳にあるが PNG が無い（削除もれ）' });

const summary = `[${NAME}] X カード PNG ${pngs.length} 枚 / 台帳 ${Object.keys(entries).length} 件 → 実検査 ${inspected} 枚`
  + ` / error ${errors.length} / warn ${warnings.length}`;

if (JSON_OUT) {
  writeSync(1, `${JSON.stringify({ pngs: pngs.length, ledger: Object.keys(entries).length, inspected, errors, warnings }, null, 2)}\n`);
  process.exit(errors.length ? 1 : 0);
}

console.log(summary);
if (pngs.length === 0) {
  console.error(`[${NAME}] ✗ 検査不成立: 対象の PNG が 1 枚も無い。0 件を「異常なし」と読まない。`);
  process.exit(1);
}
for (const w of warnings.slice(0, 15)) console.log(`  [warn] ${w.at}  ${w.msg}`);
if (warnings.length > 15) console.log(`  … ほか ${warnings.length - 15} 件の warn`);
if (errors.length === 0) {
  console.log(`[${NAME}] ✓ 配色は試験別テーマ色と一致・主題は全て非空`);
  process.exit(0);
}
for (const e of errors.slice(0, 25)) console.error(`  [${e.rule}] ${e.at}  ${e.msg}`);
if (errors.length > 25) console.error(`  … ほか ${errors.length - 25} 件`);
console.error(`\n台帳は gen-x-card.mjs が書く。未登録の画像は \`node scripts/gen-x-card.mjs --all --force\` で載る。`);
process.exit(1);
