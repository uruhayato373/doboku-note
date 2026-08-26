/**
 * backlog スキーマゲート — .claude/todo/backlog.md の機械読取契約が壊れていないかを検査する。
 *
 * 背景: タグ行の token は admin TODO ボードと /backlog-sweep の選定を駆動する。値が語彙から
 *   外れても旧実装は黙って category に化けさせるか捨てていたため、誰も気づかないまま
 *   カテゴリ語彙が凡例 6 種に対し実体 14 種へ散った。`[検証:cmd]` に至っては実在しない
 *   npm script を指していても sweep が「検証したつもり」で完了扱いにできた（§9 の検査ゼロ PASS）。
 *
 * 検査は必ず parseBacklog() の構造化出力を読む。**生 grep しない** — 凡例のテンプレ行や
 * カード本文の prose に `[検証:cmd]` 等が現れ、偽陽性が出る。
 *
 * 全量モード（既定）:
 *   1. 未知キーの token（[実行者:x] のような打ち間違い。廃止済み [実行:] もここで error）が無い
 *   2. [種類:] が KINDS の語彙内（null は移行中のみ許容）
 *   4. カテゴリが CANONICAL_CATEGORIES ∪ baseline の語彙内
 *   5. [検証:cmd] が package.json の scripts に実在する
 *   6. 生 `### ` 行数 == カード数 + orphan 数（パーサ退行・フェンス事故の検知）
 *   7. tools/admin-app/src/lib/todo.ts が backlog-lib を import し、自前のタグ分解を持たない
 *
 * --staged モード（追加行のみ・ラチェット。既存分の返済は強制しない）:
 *   8. 完了 prose の混入（backlog.md:5「完了したタスクはセクションごと削除する」の違反）
 *   9. 新規カードの token 必須（タグ: 行 / [種類:] / [起票:]）— ラチェット
 *  10. .claude/todo/ に 4 層以外の .md が追加された（影のバックログの新規発生）
 *
 * Usage:
 *   node scripts/check-backlog-schema.mjs            全量
 *   node scripts/check-backlog-schema.mjs --staged   staged の追加行も検査（pre-commit）
 *   node scripts/check-backlog-schema.mjs --json     機械可読
 *
 * exit: 0 合格 / 1 違反 / 2 検査不成立（backlog 不在・カード 0 件・package.json 不読）
 * 緊急回避: SKIP_BACKLOG_SCHEMA=1 または git commit --no-verify
 *
 * 真実源: .claude/todo/backlog.md 冒頭の凡例 ／ .claude/knowledge/reference/information-architecture.md
 */
import { readFileSync, existsSync, readdirSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  parseBacklog,
  findOrphanHeadings,
  KINDS,
  CANONICAL_CATEGORIES,
  TODO_LAYER_FILES,
  DOBOKU_ID_PATTERN,
} from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = '.claude/todo/backlog.md';
const BASELINE = '.claude/config/backlog-vocab-baseline.json';
const TODO_LAYERS = TODO_LAYER_FILES;

/** 完了を「報告」する形。allowlist はこれから完了させるための記述で backlog にあるべきもの。 */
const DONE_PATTERNS = [
  { re: /\[!(done|success)\]/, why: '完了 callout' },
  { re: /~~[^~]+~~\s*(→|:|：)?\s*\*{0,2}完了/, why: '取り消し線 + 完了' },
  { re: /(実施完了|対応完了|完了しました|完了済み（20)/, why: '完了報告の定型句' },
  { re: /^\s*[-*]\s+\[x\]\s/i, why: 'チェック済みボックス' },
];
const DONE_ALLOW = /完了条件|完了したら|完了検知|完了率|完了まで|完了時|完了判定/;

export function validateCards(cards, orphans, opts) {
  const { rawHeadingCount, npmScripts, allowedCategories } = opts;
  const v = [];
  const at = (c) => `${BACKLOG}:${c.line}`;

  // ID は 2026-08-18 に必須化（monthly/weekly と docs/ の恒久文書が ID で結線するため）。
  const seenIds = new Map();
  for (const c of cards) {
    if (!c.id) {
      v.push({ rule: 'id-missing', at: at(c), msg: `「${c.title.slice(0, 40)}」に ID が無い（\`### [DN-####] タイトル\`）` });
    } else if (!DOBOKU_ID_PATTERN.test(c.id)) {
      v.push({ rule: 'id-format', at: at(c), msg: `ID「${c.id}」は DN-#### 形式でない` });
    } else if (seenIds.has(c.id)) {
      v.push({ rule: 'id-duplicate', at: at(c), msg: `ID「${c.id}」が L${seenIds.get(c.id)} と重複` });
    }
    if (c.id) seenIds.set(c.id, c.line);
    for (const u of c.unknownKeys ?? []) {
      // [実行:] は 2026-08-26 に軸ごと廃止（単独で回せるかは選定側モデルが本文で判断）。
      // TAG_KEYS から外れたので unknownKeys に落ち、ここで再導入を止める。
      v.push({ rule: 'unknown-key', at: at(c), msg: `未知の token キー [${u.raw}]（語彙: ${Object.keys({ 種類: 1, 検証: 1, 起票: 1, 期日: 1 }).join('/')}${u.key === '実行' ? '。[実行:] 軸は 2026-08-26 廃止' : ''}）` });
    }
    if (c.kind && !KINDS.includes(c.kind)) {
      v.push({ rule: 'kind', at: at(c), msg: `[種類:${c.kind}] は語彙外（${KINDS.join(' / ')}）` });
    }
    for (const cat of [c.category, ...(c.extraCategories ?? [])]) {
      if (cat && cat !== '未分類' && !allowedCategories.has(cat)) {
        v.push({ rule: 'category', at: at(c), msg: `カテゴリ「${cat}」は語彙外（正典: ${CANONICAL_CATEGORIES.join(' / ')}）` });
      }
    }
    if (c.verify && !npmScripts.has(c.verify)) {
      v.push({ rule: 'verify', at: at(c), msg: `[検証:${c.verify}] は package.json に無い＝sweep が「検証したつもり」になる` });
    }
  }

  if (rawHeadingCount !== cards.length + orphans.length) {
    v.push({
      rule: 'parser',
      at: BACKLOG,
      msg: `生 ### ${rawHeadingCount} 行 ≠ カード ${cards.length} + orphan ${orphans.length}（パーサ退行・フェンス事故を疑う）`,
    });
  }
  return v;
}

/**
 * @param addedLines staged で追加された行
 * @param addedTodoFiles 追加された 4 層以外の .md
 * @param cards parseBacklog の出力（新規カードの token 必須チェック用）
 */
export function validateStagedLines(addedLines, addedTodoFiles, cards = [], knownTitles = null) {
  const v = [];
  // 新規カードは token を揃える（ラチェット＝既存カードの欠落は返済を強制しない）。
  // docstring には rule 9 として書かれていたが 2026-08-18 まで未実装だった。
  // [起票:] を必須に含めるのは、手入力ゆえ 91 枚中 61 枚で欠落し、鮮度検査 S5 が
  // 構造的に発火しなくなっていたため（git blame での補完は partial clone がコールドだと
  // 打ち切られるので、補完に頼らず入口で埋める）。
  const addedHeadings = new Set(
    addedLines.filter((l) => /^###\s+/.test(l.text)).map((l) => l.line),
  );
  for (const c of cards) {
    if (!addedHeadings.has(c.line)) continue;
    // 見出し行の**書き換え**（ID 付番のような一括変更）は diff 上は追加行に見えるが新規カードではない。
    // HEAD 側に同じタイトルがあれば既存カード扱いにする（2026-08-18 の ID 移行で 61 件の
    // 偽陽性が出たため。ゲートを緩めるのではなく「新規」の判定を実体に合わせる）。
    if (knownTitles && knownTitles.has(c.title)) continue;
    const missing = [];
    if (!c.hasTagLine) missing.push('タグ: 行');
    else {
      if (!c.kind) missing.push('[種類:]');
      if (!c.filed) missing.push('[起票:]');
    }
    if (missing.length) {
      v.push({
        rule: 'new-card-tokens',
        at: `${BACKLOG}:${c.line}`,
        msg: `新規カード「${c.title.slice(0, 40)}」に ${missing.join(' / ')} が無い`,
      });
    }
  }
  for (const { file, line, text } of addedLines) {
    if (DONE_ALLOW.test(text)) continue;
    for (const p of DONE_PATTERNS) {
      if (p.re.test(text)) {
        v.push({
          rule: 'done-prose',
          at: `${file}:+${line}`,
          msg: `${p.why}: ${text.trim().slice(0, 60)}`,
        });
        break;
      }
    }
  }
  for (const f of addedTodoFiles) {
    v.push({ rule: 'todo-layer', at: f, msg: '.claude/todo/ は annual/monthly/weekly/backlog の 4 層のみ（影のバックログ）' });
  }
  return v;
}

function gitStaged(args) {
  try {
    return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return null;
  }
}

function main() {
  if (process.env.SKIP_BACKLOG_SCHEMA === '1') {
    console.log('[check-backlog-schema] SKIP_BACKLOG_SCHEMA=1 のためスキップ');
    process.exit(0);
  }
  const STAGED = process.argv.includes('--staged');
  const JSON_OUT = process.argv.includes('--json');

  const backlogPath = join(ROOT, BACKLOG);
  if (!existsSync(backlogPath)) {
    console.error(`✗ 検査不成立: ${BACKLOG} が無い`);
    process.exit(2);
  }
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  } catch {
    console.error('✗ 検査不成立: package.json を読めない（[検証:] の実在を確かめられない）');
    process.exit(2);
  }

  const text = readFileSync(backlogPath, 'utf8');
  const cards = parseBacklog(text);
  const orphans = findOrphanHeadings(text);
  if (!cards.length) {
    console.error('✗ 検査不成立: カードを 1 件も抽出できなかった（パース契約の破損を疑う）');
    process.exit(2);
  }

  const baseline = existsSync(join(ROOT, BASELINE))
    ? JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'))
    : { categories: {} };
  const allowedCategories = new Set([...CANONICAL_CATEGORIES, ...Object.keys(baseline.categories ?? {})]);

  const violations = validateCards(cards, orphans, {
    rawHeadingCount: (text.match(/^### /gm) ?? []).length,
    npmScripts: new Set(Object.keys(pkg.scripts ?? {})),
    allowedCategories,
  });

  // 構造アサーション: admin が自前のタグ分解へ戻っていないか（2 実装の再分岐を止める）
  const todoTs = join(ROOT, 'tools/admin-app/src/lib/todo.ts');
  if (existsSync(todoTs)) {
    const src = readFileSync(todoTs, 'utf8');
    if (!src.includes('backlog-lib.mjs')) {
      violations.push({ rule: 'admin-parser', at: 'tools/admin-app/src/lib/todo.ts', msg: 'backlog-lib.mjs を import していない（パーサの二重実装に戻っている）' });
    }
  }

  let stagedChecked = 0;
  if (STAGED) {
    const diff = gitStaged(['diff', '--cached', '-U0', '--', BACKLOG]);
    const addedLines = [];
    if (diff) {
      let ln = 0;
      for (const l of diff.split('\n')) {
        const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
        if (h) { ln = Number(h[1]); continue; }
        if (l.startsWith('+') && !l.startsWith('+++')) { addedLines.push({ file: BACKLOG, line: ln, text: l.slice(1) }); ln += 1; }
      }
    }
    stagedChecked = addedLines.length;
    const names = gitStaged(['diff', '--cached', '--name-only', '--diff-filter=A']) ?? '';
    const addedTodoFiles = names
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => /^\.claude\/todo\/[^/]+\.md$/.test(s) && !TODO_LAYERS.includes(s.split('/').pop()));
    let knownTitles = null;
    const headRaw = gitStaged(['show', `HEAD:${BACKLOG}`]);
    if (headRaw) knownTitles = new Set(parseBacklog(headRaw).map((c) => c.title));
    violations.push(...validateStagedLines(addedLines, addedTodoFiles, cards, knownTitles));
  }

  // 検査ゼロを PASS と呼ばない（§9）: 対象数と実検査数を必ず出す
  const summary = `[check-backlog-schema] カード ${cards.length} 件${STAGED ? ` / staged 追加行 ${stagedChecked} 行` : ''} を実検査 / 違反 ${violations.length} 件`;

  if (JSON_OUT) {
    writeSync(1, JSON.stringify({ cards: cards.length, stagedChecked, violations }, null, 2) + '\n');
    process.exit(violations.length ? 1 : 0);
  }

  console.log(summary);
  if (!violations.length) {
    console.log('[check-backlog-schema] ✓ タグ行の語彙・検証コマンド・パーサ契約はすべて健全');
    process.exit(0);
  }
  for (const v of violations) console.error(`  [${v.rule}] ${v.at}  ${v.msg}`);
  console.error(
    '\n語彙は .claude/todo/backlog.md 冒頭の凡例が真実源。既存の別名カテゴリは ' +
      `${BASELINE} に理由付きで登録して漸減させる（新規の語彙外は増やさない）。\n` +
      '緊急回避: SKIP_BACKLOG_SCHEMA=1\n',
  );
  process.exit(1);
}

// import 時に CLI を走らせない（テストから validateCards だけ使うため）
const isMain = process.argv[1] && process.argv[1].endsWith('check-backlog-schema.mjs');
if (isMain) main();
