#!/usr/bin/env node
/**
 * check-keiken-answer-split.mjs — 施工経験記述の解答欄の「要素の割り振り」が級と合っているか
 * ---------------------------------------------------------------------------
 * なぜ必要か:
 *   1級と2級で、令和6年度以降の解答欄の区切り方が違う。
 *     1級: (1) 現場状況・技術的課題**と検討した項目** / (2) 検討項目の対応処置とその評価
 *     2級: (1) 現場状況・技術的課題            / (2) **検討した項目**とその対応処置
 *   検討項目がどちら側に入るかが逆なので、2級の割り振りを1級教材に使うと (2) に
 *   検討＋対応処置＋評価の3要素が乗る。1級の解答欄は1区画 8行×25字=約200字なので
 *   物理的に収まらない。
 *
 *   2026-08-31、ココナラ C8 予想模試（1級）がこの状態で販売されており、購入者から
 *   「文字数がオーバーする」と指摘されて発覚した。既存の keiken-charcount は
 *   content/note 配下しか走査せず、模試は .claude/config/coconala/assets/moshi-src の
 *   生成 markdown だったため射程外だった。**置き場が違うだけで検査から外れる**のを塞ぐ。
 *
 * 判定（助詞で「②に書かせているか」を切り分ける）:
 *   1級の(2)に「検討した内容/項目」が **と/、で並列** されていれば違反。
 *     誤: 「検討した内容と対応処置・評価」   → 検討そのものを②に書かせている
 *     正: 「(1)で検討した項目の対応処置」「検討した項目への対応処置」 → ②は対応処置だけ
 *   2級の(1)に検討項目が入っていれば違反（1級式の混入）。
 *   旧形式（設問(3) がある R3〜R5）は割り振りが別物なので対象外。
 *
 * 使い方:
 *   node scripts/check-keiken-answer-split.mjs [--json]
 * exit: 0=違反なし / 1=違反あり / 2=検査不成立（対象0件）
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const TAG = '[check-keiken-answer-split]';
const AS_JSON = process.argv.includes('--json');
const ROOT = process.cwd();

// 走査対象。note 原稿だけでなく、退避される生成 markdown（模試）も必ず含める。
const SCAN = [
  { dir: 'content/note/1級・2級土木', label: 'note 原稿' },
  { dir: '.claude/config/coconala/assets/moshi-src', label: 'ココナラ模試の生成原稿' },
  // 2026-08-31 追加。C8 の事故のあと横断で棚卸ししたら、**射程外の 5 領域から新たに 2 件**
  // 出た（Brain の配布キット・site の 1級ガイド）。置き場が違うだけで検査から外れる状態を
  // これ以上残さない。
  { dir: 'content/site/civil-construction-1', label: 'サイト 1級' },
  { dir: 'content/site/civil-construction-2', label: 'サイト 2級' },
  { dir: 'content/coconala/blog', label: 'ココナラブログ' },
  { dir: 'content/sns', label: 'SNS 原稿' },
  { dir: '.claude/agents', label: '生成エージェント定義' },
];

/** パスから級を判定。"1級・2級土木" が "2級土木" を含むのでセグメント単位で見る。 */
function gradeOf(p) {
  const segs = p.split(/[\\/]/);
  if (segs.some((s) => s === '2級土木' || /^C9-2級/.test(s) || s === 'civil-construction-2')) return 'civil-2';
  if (segs.some((s) => s === '1級土木' || /^C8-1級/.test(s) || s === 'civil-construction-1')) return 'civil-1';
  // ファイル名に級が出るもの（Brain キットの references/civil-1.md など）
  const base = segs[segs.length - 1] || '';
  if (/(^|[^0-9])civil-2(\.|$|-)/.test(base) || /2級/.test(base)) return 'civil-2';
  if (/(^|[^0-9])civil-1(\.|$|-)/.test(base) || /1級/.test(base)) return 'civil-1';
  return null; // 判定できないものは対象外（誤検知を作らない）
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.mdx?$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * その位置が「旧形式（legacy3）の説明セクション」に属するか。
 *
 * 1 ファイルに現行形式と旧形式の両方を並べて説明する資料がある（Brain キットの
 * references/civil-1.md がまさにそれ）。ファイル全体を「設問(3) があるから対象外」に
 * すると、**同じファイルの現行形式の説明が丸ごと無検査**になる。直前の見出しで切り分ける。
 */
const LEGACY_HEADING = /旧形式|legacy3|令和5年度以前|〜\s*R05|以前の形式/;
function sectionIsLegacy(text, index) {
  const before = text.slice(0, index);
  const heads = [...before.matchAll(/^#{1,6}\s*(.+)$/gm)];
  const last = heads[heads.length - 1];
  return last ? LEGACY_HEADING.test(last[1]) : false;
}

/** 解答欄ラベルらしい行を拾う。`[[記入欄:8|② …]]` と `**(2) …**` / `**② …**` に対応。 */
function labelsOf(text) {
  const out = [];
  const push = (slot, label) => out.push({ slot, label: label.trim() });
  for (const m of text.matchAll(/\[\[記入欄:\d+\|([^\]]+)\]\]/g)) {
    const l = m[1];
    if (/^[①(（]?1?[)）]?\s*①/.test(l) || l.startsWith('①')) push(1, l);
    else if (l.startsWith('②')) push(2, l);
  }
  for (const m of text.matchAll(/^\*\*\s*(\(1\)|\(2\)|①|②)\s*([^*]+)\*\*/gm)) {
    const slot = m[1] === '(1)' || m[1] === '①' ? 1 : 2;
    push(slot, m[1] + ' ' + m[2]);
  }
  // 箇条書きの要素ラベル（配点目安・チェックリスト等）。`- ② 検討した内容：3点（…）` の形。
  // **設問文だけ直して配点表を直し忘れる**のが実際に起きた（2026-08-31 の C8 模試。
  // 設問(2)・字数案内は 1級式へ直っていたのに、配点目安だけ「② 検討した内容」が残っていた）。
  // 要素名は「：」「（」の手前まで。点数や採点基準の文言まで含めると誤検知する。
  for (const m of text.matchAll(/^\s*[-*]\s*([①②])\s*([^：:（(\n]+)/gm)) {
    push(m[1] === '①' ? 1 : 2, m[1] + ' ' + m[2]);
  }
  // `- 設問(2): 検討した項目と採用した処置・その評価` / `## 設問(2) …` 形式。
  // Brain の配布キットや skill の reference はこの書き方で、2026-08-31 の棚卸しでは
  // **この記法だったせいで抽出されず、販売中の商品の誤りを 1 件も拾えていなかった**。
  // 旧形式（legacy3）は設問(2)=検討で正しいので、下の sectionIsLegacy で除外する。
  for (const m of text.matchAll(/^[\s\-*]*(?:#{2,4}\s*)?設問\s*[(（]\s*([12])\s*[)）]\s*[:：]?\s*([^\n]+)$/gm)) {
    const idx = m.index ?? 0;
    if (sectionIsLegacy(text, idx)) continue;
    push(Number(m[1]), (m[1] === '1' ? '① ' : '② ') + m[2].trim());
  }
  // 設問文（「それぞれ①…、②…を記述しなさい」）も拾う
  for (const m of text.matchAll(/それぞれ①([^、]+)、②([^を]+)を記述/g)) {
    push(1, '① ' + m[1]);
    push(2, '② ' + m[2]);
  }
  return out;
}

// 「②に検討要素を書かせている」形だけを拾う。助詞で切り分けるのが決め手:
//   誤: 「検討した内容**と**対応処置」「検討した項目**と**その対応処置」
//        → 並列＝検討そのものを②に書かせている（1級では収まらない）
//   正: 「(1)で検討した項目**の**対応処置」「検討した項目**への**対応処置」
//        → 参照＝②に書くのは対応処置だけ
// 素朴な「検討」一致だと後者まで拾って 45 件の偽陽性になった（2026-08-31 実測）。
const KENTO_WRITTEN_HERE = /検討(した)?(内容|項目|事項)\s*(と|、)/;
const KENTO_ANY = /検討(した)?(内容|項目|事項)/;

/**
 * 字数案内（「（１）…（10行・250字程度）」）が解答欄の実寸と合っているか。
 *
 * 割り振りが正しくても、案内する行数・字数がズレていれば受験者は書けない。
 * 2026-08-31 の C8 は「7行250字／9行300字」で、記入欄の 8 行とも limits の 200 字とも
 * 食い違っていた。同じ数値が C9 側に残骸として生き残っていたのを棚卸しで発見した。
 * 真実源は .claude/config/keiken-answer-sheet-limits.json。
 */
const SHEET_LIMITS = JSON.parse(readFileSync(join(ROOT, '.claude/config/keiken-answer-sheet-limits.json'), 'utf8'));

/**
 * 字数案内（「（１）…（10行・250字程度）」）が実寸と合っているか。
 *
 * 割り振りが正しくても、案内する行数・字数がズレていれば受験者は書けない。
 * 2026-08-31 の C8 は「7行250字／9行300字」で、記入欄 8 行とも limits の 200 字とも
 * 食い違っていた。同じ数値が C9 側に残骸として生き残っていたのを棚卸しで発見した。
 *
 * 字数は limits（真実源）と、行数は**同一文書の [[記入欄:N]] の実寸**と突き合わせる。
 * 行数を maxChars/char_per_line で計算しないのは、char_per_line が「1行20〜25字」の
 * 代表値でしかなく、記入欄の行数は資料側の設計値だから（2級は 250/22=11.4 だが実際は 10 行）。
 */
function maxCharsOf(grade) {
  return SHEET_LIMITS.grades?.[grade]?.limits?.current2_q1?.maxChars ?? null;
}
function sheetLinesOf(text) {
  const ns = [...text.matchAll(/\[\[記入欄:(\d+)/g)].map((m) => Number(m[1]));
  if (!ns.length) return null;
  const freq = new Map();
  for (const n of ns) freq.set(n, (freq.get(n) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0]; // 最頻値＝答案欄の行数
}
function checkGuidance(text, grade, rel, out) {
  const maxChars = maxCharsOf(grade);
  const sheetLines = sheetLinesOf(text);
  let n = 0;
  for (const m of text.matchAll(/[（(]\s*(\d+)\s*行・\s*(\d+)\s*字程度\s*[)）]/g)) {
    if (sectionIsLegacy(text, m.index ?? 0)) continue;
    n++;
    const lines = Number(m[1]);
    const chars = Number(m[2]);
    const bad = [];
    if (maxChars && chars !== maxChars) bad.push(`字数 ${chars} ≠ 解答欄上限 ${maxChars}`);
    if (sheetLines && lines !== sheetLines) bad.push(`行数 ${lines} ≠ 同文書の記入欄 ${sheetLines} 行`);
    if (bad.length) {
      out.push({
        file: rel, grade, slot: 0, label: m[0],
        why: `字数案内が実寸と違う（${bad.join(' / ')}）。この案内どおりに書くと欄に収まらない`,
      });
    }
  }
  return n;
}

const violations = [];
let filesScanned = 0;
let filesWalked = 0;
let guidanceScanned = 0;
let labelsScanned = 0;
const perScan = [];

for (const s of SCAN) {
  const files = walk(join(ROOT, s.dir));
  perScan.push({ label: s.label, dir: s.dir, exists: existsSync(join(ROOT, s.dir)), files: files.length });
  for (const abs of files) {
    const rel = abs.slice(ROOT.length + 1).split(sep).join('/');
    filesWalked++;
    const grade = gradeOf(rel);
    if (!grade) continue;
    const text = readFileSync(abs, 'utf8');
    // 旧3項目形式（設問(3) がある）は割り振りが別物なので対象外。ただし現行形式の
    // 見出しが同居するファイルは**現行側を検査したい**ので落とさない（セクションで切る）。
    const hasLegacy = /\*\*\(3\)|設問（3）|\[\[記入欄:\d+\|③/.test(text);
    const hasCurrentSection = /現行形式|current2|令和6年度以降|R06〜/.test(text);
    if (hasLegacy && !hasCurrentSection) continue;
    // 字数案内はラベルの有無と独立に検査する。ここを `if (!labels.length) continue` の
    // 後ろに置くと、解答欄ラベルを持たない解説ファイル（C9 の解答解説がまさにそれ）が
    // 丸ごと素通りする（2026-08-31 実測: 4 件あるうち 2 件しか検査できていなかった）。
    guidanceScanned += checkGuidance(text, grade, rel, violations);
    const labels = labelsOf(text);
    if (!labels.length) continue;
    filesScanned++;
    for (const { slot, label } of labels) {
      labelsScanned++;
      // 箇条書きの要素ラベルは「② 検討した項目」のように助詞を伴わないので、
      // KENTO_WRITTEN_HERE（と/、での並列）では拾えない。要素名そのものが検討なら違反。
      if (slot === 2 && /^②\s*検討(した)?(内容|項目|事項)\s*$/.test(label) && grade === 'civil-1') {
        violations.push({ file: rel, grade, slot, label, why: '1級の配点/要素一覧で検討要素を②側に置いている。1級の検討項目は①側（設問文だけ直して配点表を直し忘れた形）' });
        continue;
      }
      if (slot === 2 && KENTO_WRITTEN_HERE.test(label) && grade === 'civil-1') {
        violations.push({ file: rel, grade, slot, label, why: '1級の(2)で検討要素を書かせている（2級式の混入）。検討項目は(1)側。②は「(1)で検討した項目の対応処置とその評価」' });
      }
      if (slot === 1 && KENTO_ANY.test(label) && grade === 'civil-2') {
        violations.push({ file: rel, grade, slot, label, why: '2級の(1)に検討項目が入っている（1級式の混入）。2級は(2)側が正しい' });
      }
    }
  }
}

if (AS_JSON) {
  process.stdout.write(JSON.stringify({ filesScanned, labelsScanned, perScan, violations }, null, 2) + '\n');
}

for (const s of perScan) {
  if (!s.exists && !AS_JSON) {
    console.log(`${TAG} ! ${s.label}（${s.dir}）が手元に無い＝この範囲は未検査。`);
    console.log('    退避済みなら: npm run asset-hydrate -- --path ' + s.dir);
  }
}
if (!AS_JSON) console.log(`${TAG} 実検査 ${filesScanned} ファイル（走査 ${filesWalked}）/ 解答欄ラベル ${labelsScanned} 件 / 字数案内 ${guidanceScanned} 件`);

// 「異常0件」と「1件も検査していない」を区別する（CLAUDE.md §9）
if (labelsScanned === 0) {
  console.error(`${TAG} ✗ 検査不成立: 解答欄ラベルを 1 件も読めていない。対象の置き場か抽出規則が変わった可能性がある`);
  process.exit(2);
}

if (violations.length) {
  console.error('');
  console.error(`${TAG} ✗ 級と解答欄の割り振りが食い違う箇所 ${violations.length} 件`);
  for (const v of violations.slice(0, 20)) {
    console.error(`  ${v.file}  [${v.grade} の(${v.slot})]  「${v.label}」`);
    console.error(`    → ${v.why}`);
  }
  console.error('');
  console.error('  真実源: content/site/civil-construction-{1,2}/secondary-r0{6,7}/article.mdx の設問文');
  process.exit(1);
}

if (!AS_JSON) console.log(`${TAG} ✓ 1級・2級とも解答欄の割り振りは実出題どおり`);
