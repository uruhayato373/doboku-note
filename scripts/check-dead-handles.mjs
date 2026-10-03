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
 *   (1) 追跡下のテキストに退役ハンドルが現れたら NG。過去の計測ログなど、
 *       歴史記録として残すべき場所は allowlist に理由付きで載せる。
 *   (2) コードが現行の識別子（サイトの origin・note のクリエイター・GSC のプロパティ・R2 のホスト・X/IG のハンドル）を
 *       定数として再宣言していたら NG。退役ハンドルを名前で禁止するのは後追いなので、現行の値を
 *       1 か所（src/config/site-identity.mjs・scripts/lib/site-identity.mjs）に寄せ、書き写しを止める。
 *       判定は scripts/lib/identity-literals.mjs（記事 1 本分の URL のようなデータは止めない）。
 *
 * 使い方:
 *   node scripts/check-dead-handles.mjs            # 全件
 *   node scripts/check-dead-handles.mjs --staged   # staged のみ（pre-commit）
 * exit: 0=健全 / 1=退役ハンドルの参照あり or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { findIdentityLiterals, isIdentityScanTarget } from './lib/identity-literals.mjs';

const STAGED = process.argv.includes('--staged');

// 退役したハンドル。**なぜ死んだか**を必ず書く（生きているものを足さないため）。
const DEAD = [
  { pattern: /note\.com\/uruhayato(?![0-9])/g, why: 'note の旧ハンドル（HTTP 404・実査 2026-08-13）', use: 'note.com/dobokunote' },
  // X の URL 形でのみ禁止する。**素の `dobokunotecom` を禁止してはいけない**——
  // 同じ文字列が Instagram の**現行**ハンドル（config/ig-account.json）だからで、
  // 全面禁止にすると 60 件超の誤検知になり、ゲートごと無視されるようになる（2026-08-13 に一度そうなった）。
  { pattern: /(x|twitter)\.com\/dobokunotecom\b/g, why: 'X の旧アカウント（2026-06-12 凍結・異議却下）', use: 'x.com/doboku373' },
];

// 歴史記録として残す場所（消すと経緯が失われる）。理由を必ず書く。
const ALLOW = [
  { re: /^data\//, why: '事業の記録（当時の実測値・競合スナップショットの時系列そのもの）' },
  { re: /^content\/sns\/x\/(draft|published)\/_archive/, why: '旧アカウント時代の投稿アーカイブ' },
  { re: /^\.claude\/knowledge\/reference\/(x-post-policy|measurement-incidents|ig-publish-reconcile)\.md$/, why: '凍結の経緯そのものを記録している SSOT' },
  { re: /^scripts\/check-dead-handles\.mjs$/, why: '本チェッカ自身（禁止パターンを持つ）' },
  { re: /^docs\/todo\//, why: '起票時の経緯記録' },
  { re: /^\.claude\/state\/youtube-schedule\.json$/, why: '投稿済み動画の当時のメタデータ（ライブ修正の記録は別途）' },
];

const isAllowed = (f) => ALLOW.some((a) => a.re.test(f));

let files;
if (STAGED) {
  files = execSync('git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split('\n').filter((f) => f && existsSync(f));
} else {
  // このリポジトリは追跡ファイルが 6 万超あり、既定バッファでは ENOBUFS で落ちる
  // （2026-08-13 実発生）。拡張子で絞ってから取得し、上限も明示的に上げる。
  // shell を通さない。cmd.exe はシングルクォートを剥がさないので、execSync だと git が
  // `'*.md'` というリテラルを受け取り Windows で走査 0 件＝検査不成立になる（2026-08-24 実測）。
  // -c core.quotepath=false が無いと、git は非 ASCII を含むパスを 8 進エスケープした
  // "content/note/\346\212\200…" の形で返す。このリポジトリは .md の 38%（975/2553）が
  // 日本語パス配下なので、無いとその全てが存在しないファイル名になり、**走査したことに
  // なったまま素通りして ✓ が出る**（2026-08-30 実測）。
  files = execFileSync(
    'git',
    ['-c', 'core.quotepath=false',
      'ls-files', '--', '*.md', '*.mdx', '*.json', '*.mjs', '*.cjs', '*.js', '*.ts', '*.mts', '*.tsx', '*.txt', '*.yml', '*.yaml', '*.sh'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  ).split('\n').filter(Boolean);
}
// バイナリ・巨大ファイルは除く
files = files.filter((f) => /\.(md|mdx|json|mjs|cjs|js|ts|mts|tsx|txt|ya?ml|sh)$/.test(f));

if (!STAGED && files.length === 0) {
  console.error('[check-dead-handles] NG: 走査対象が 0 ファイル（検査不成立）');
  process.exit(1);
}

const hits = [];
const redeclared = [];
let identityScanned = 0;
for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  if (isIdentityScanTarget(f)) {
    identityScanned += 1;
    for (const h of findIdentityLiterals(src)) redeclared.push({ file: f, ...h });
  }
  if (isAllowed(f)) continue;
  for (const d of DEAD) {
    d.pattern.lastIndex = 0;
    if (!d.pattern.test(src)) continue;
    const line = src.split('\n').findIndex((l) => { d.pattern.lastIndex = 0; return d.pattern.test(l); }) + 1;
    hits.push({ file: f, line, why: d.why, use: d.use });
  }
}

console.log(`[check-dead-handles] ${files.length} ファイルを実検査（退役ハンドル ${DEAD.length} 種 / allowlist ${ALLOW.length} 種）`);
console.log(`[check-dead-handles] うちコード ${identityScanned} ファイルで現行の識別子の再宣言を検査`);

// 全件実行でコードが 1 件も走査されないのは、検査が動いていないだけ（緑にしない）
if (!STAGED && identityScanned === 0) {
  console.error('[check-dead-handles] NG: 識別子の再宣言の走査対象が 0 ファイル（検査不成立）');
  process.exit(1);
}

if (hits.length) {
  console.error(`[check-dead-handles] NG: 退役ハンドルへの参照 ${hits.length} 件`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.why} → ${h.use} を使う`);
  console.error('\n  歴史記録として残す必要があるなら、check-dead-handles.mjs の ALLOW に理由付きで追加する。');
}
if (redeclared.length) {
  console.error(`[check-dead-handles] NG: 現行の識別子の再宣言 ${redeclared.length} 件`);
  for (const h of redeclared) console.error(`  ${h.file}:${h.line}  ${h.text}  → ${h.use} を import する`);
  console.error('\n  サイト・アカウントの識別子は定義 1 か所から import する（書き写すと値が動いたとき直し漏れる）。');
  console.error('  記事 1 本分の URL のようなデータは止めない。意図して書く行は行末に `// identity-literal-ok: 理由`。');
}
if (hits.length || redeclared.length) process.exit(1);
console.log('[check-dead-handles] ✓ 退役ハンドルへの参照なし・識別子の再宣言なし');
