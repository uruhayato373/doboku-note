#!/usr/bin/env node
/**
 * check-dead-handles.mjs — 退役したアカウント/ハンドルへの参照を検出する
 * ---------------------------------------------------------------------------
 * 背景（2026-08-13 実発生）:
 *   SNS 共通設定 `.claude/scripts/lib/sns-common/sns-config.mjs` の `noteUrl` が
 *   `note.com/uruhayato`（**HTTP 404**）のままで、そこから生成された YouTube 概要欄
 *   32 本すべてが死んだリンクで公開されていた。生成物は gitignore なので目に触れず、
 *   SSOT 側を誰も見直していなかった。x-repost の `ownHandle` も凍結済みの
 *   `dobokunotecom` のまま残っていた。
 *
 *   アカウントの移行は「1箇所直して終わり」に見えて、設定・台帳・原稿・生成物に
 *   散らばる。**退役ハンドルを名前で禁止**するのが唯一の確実な止め方。
 *
 * 検査:
 *   追跡下のテキストに退役ハンドルが現れたら NG。過去の計測ログなど、
 *   歴史記録として残すべき場所は allowlist に理由付きで載せる。
 *
 * 使い方:
 *   node scripts/check-dead-handles.mjs            # 全件
 *   node scripts/check-dead-handles.mjs --staged   # staged のみ（pre-commit）
 * exit: 0=健全 / 1=退役ハンドルの参照あり or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');

// 退役したハンドル。**なぜ死んだか**を必ず書く（生きているものを足さないため）。
const DEAD = [
  { pattern: /note\.com\/uruhayato(?![0-9])/g, why: 'note の旧ハンドル（HTTP 404・実査 2026-08-13）', use: 'note.com/dobokunote' },
  // X の URL 形でのみ禁止する。**素の `dobokunotecom` を禁止してはいけない**——
  // 同じ文字列が Instagram の**現行**ハンドル（.claude/config/ig-account.json）だからで、
  // 全面禁止にすると 60 件超の誤検知になり、ゲートごと無視されるようになる（2026-08-13 に一度そうなった）。
  { pattern: /(x|twitter)\.com\/dobokunotecom\b/g, why: 'X の旧アカウント（2026-06-12 凍結・異議却下）', use: 'x.com/doboku373' },
];

// 歴史記録として残す場所（消すと経緯が失われる）。理由を必ず書く。
const ALLOW = [
  { re: /^\.claude\/state\/metrics\//, why: '過去の計測ログ（当時の実測値そのもの）' },
  { re: /^\.claude\/state\/(x-competitors|ig-competitors|note)\//, why: '競合スナップショットの時系列' },
  { re: /^content\/sns\/x\/(draft|published)\/_archive/, why: '旧アカウント時代の投稿アーカイブ' },
  { re: /^\.claude\/knowledge\/reference\/(x-post-policy|measurement-incidents|ig-publish-reconcile)\.md$/, why: '凍結の経緯そのものを記録している SSOT' },
  { re: /^scripts\/check-dead-handles\.mjs$/, why: '本チェッカ自身（禁止パターンを持つ）' },
  { re: /^docs\/todo\//, why: '起票時の経緯記録' },
  { re: /^\.claude\/state\/youtube-schedule\.json$/, why: '投稿済み動画の当時のメタデータ（ライブ修正の記録は別途）' },
];

const isAllowed = (f) => ALLOW.some((a) => a.re.test(f));

let files;
if (STAGED) {
  files = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split('\n').filter((f) => f && existsSync(f));
} else {
  // このリポジトリは追跡ファイルが 6 万超あり、既定バッファでは ENOBUFS で落ちる
  // （2026-08-13 実発生）。拡張子で絞ってから取得し、上限も明示的に上げる。
  files = execSync(
    "git ls-files -- '*.md' '*.mdx' '*.json' '*.mjs' '*.js' '*.ts' '*.tsx' '*.txt' '*.yml' '*.yaml' '*.sh'",
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  ).split('\n').filter(Boolean);
}
// バイナリ・巨大ファイルは除く
files = files.filter((f) => /\.(md|mdx|json|mjs|js|ts|tsx|txt|ya?ml|sh)$/.test(f));

if (!STAGED && files.length === 0) {
  console.error('[check-dead-handles] NG: 走査対象が 0 ファイル（検査不成立）');
  process.exit(1);
}

const hits = [];
for (const f of files) {
  if (isAllowed(f)) continue;
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  for (const d of DEAD) {
    d.pattern.lastIndex = 0;
    if (!d.pattern.test(src)) continue;
    const line = src.split('\n').findIndex((l) => { d.pattern.lastIndex = 0; return d.pattern.test(l); }) + 1;
    hits.push({ file: f, line, why: d.why, use: d.use });
  }
}

console.log(`[check-dead-handles] ${files.length} ファイルを実検査（退役ハンドル ${DEAD.length} 種 / allowlist ${ALLOW.length} 種）`);

if (hits.length) {
  console.error(`[check-dead-handles] NG: 退役ハンドルへの参照 ${hits.length} 件`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.why} → ${h.use} を使う`);
  console.error('\n  歴史記録として残す必要があるなら、check-dead-handles.mjs の ALLOW に理由付きで追加する。');
  process.exit(1);
}
console.log('[check-dead-handles] ✓ 退役ハンドルへの参照なし');
