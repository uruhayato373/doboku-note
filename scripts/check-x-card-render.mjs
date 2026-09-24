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
 * 対象は Git が管理しうる PNG（追跡済み＋未追跡・非 ignore）だけ。.gitignore 済みの PNG
 * （`*-diagrams/img/tweet-*.png` 等）は対象外で、台帳上も「PNG 無し」として扱う。ディスクを歩くと
 * ignore 済み PNG のあるローカルだけ赤・CI は緑に割れていた（DN-0259）。範囲は lib/x-card-render-scope.mjs。
 *
 * **検査ゼロを PASS と呼ばない**: 対象数と実検査数を必ず出し、対象 0 件・git 列挙失敗は exit 1。
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
import { cardSpecHash, validateCharacterCard } from './lib/x-character-spec.mjs';
import { isXCardPng, listScopedXCardPngs } from './lib/x-card-render-scope.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, '.claude/state/sns/x-card-render.json');
const X_DIR = join(ROOT, 'content/sns/x');
const JSON_OUT = process.argv.includes('--json');
const NAME = 'check-x-card-render';

const toPosix = (p) => p.split(sep).join('/');

// ディスク上の PNG は「ignore 済みで対象外になった枚数」を出すためだけに数える。
function walkPngs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkPngs(p, out);
    else if (e.isFile() && e.name.endsWith('.png')) out.push(toPosix(p.slice(ROOT.length + 1)));
  }
  return out;
}

const scoped = listScopedXCardPngs(ROOT);
if (!scoped.ok) {
  console.error(`[${NAME}] ✗ 検査不成立: ${scoped.error}。検査対象を決められないので合否を出さない。`);
  process.exit(1);
}
// index にあっても作業ツリーで消したものは「無い」扱い（削除もれを台帳側で拾う）。
const pngs = scoped.pngs.filter((rel) => existsSync(join(ROOT, rel)));
const inScope = new Set(pngs);
const ignoredOnDisk = walkPngs(X_DIR).filter((rel) => isXCardPng(rel) && !inScope.has(rel)).length;
const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { entries: {} };
const entries = ledger.entries || {};

const errors = [];
const warnings = [];
let inspected = 0;
let reproducible = 0;

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

// 「PNG が無い」は対象範囲で判定する（ignore 済み PNG がローカルにあっても CI と同じく無い扱い）。
const stalePng = Object.keys(entries).filter((k) => !inScope.has(k));
for (const k of stalePng) {
  const entry=entries[k];
  if(entry.template==='x-teacher-v1') {
    try {
      const specFile=join(ROOT,dirname(dirname(k)),'cards.json');
      const number=String(Number(k.match(/\/tweet-(\d+)-/)?.[1]));
      const spec=JSON.parse(readFileSync(specFile,'utf8')).tweets[number];
      validateCharacterCard(spec);
      if(cardSpecHash(spec)!==entry.specSha256)throw Error('画像用原稿が描画後に変わっています');
      reproducible++;
      continue;
    } catch(error) { errors.push({rule:'regeneration-source',at:k,msg:error.message});continue; }
  }
  errors.push({ rule: 'ledger-orphan', at: k, msg: '台帳にあるが PNG が無い（削除もれ）' });
}

const summary = `[${NAME}] Git 管理下の X カード PNG ${pngs.length} 枚（.gitignore 済み ${ignoredOnDisk} 枚は対象外） / 台帳 ${Object.keys(entries).length} 件 → 実検査 ${inspected} 枚`
  + ` / error ${errors.length} / warn ${warnings.length}`;

if (JSON_OUT) {
  writeSync(1, `${JSON.stringify({ pngs: pngs.length, ignoredOnDisk, ledger: Object.keys(entries).length, inspected, errors, warnings }, null, 2)}\n`);
  process.exit(errors.length ? 1 : 0);
}

console.log(summary);
if(reproducible)console.log(`[${NAME}] 先生カード ${reproducible} 件は原稿hashのみ検査。Git 管理下に画像なし・画像実体は未検査（gen-x-card --draft で再生成）。`);
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
