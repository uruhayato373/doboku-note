#!/usr/bin/env node
/**
 * check-gate-coverage.mjs — 「検査ゼロで PASS」を検知するメタゲート
 * ---------------------------------------------------------------------------
 * 背景（2026-07-28）: ゲート自身が壊れて **1 件も検査しないまま緑を返す** 事故が4件同時に
 *   見つかった。「異常0件」と「1件も検査していない」は出力が同じ緑になり、区別できない。
 *
 *   - check-note-structure   : fetch がプロキシで全滅 → FETCH_ERR は INFO 扱いで exit 0
 *   - check-note-site-utm    : join() の "\" 区切りをパス正規表現で判定 → Windows の全量が常に0件
 *   - check-note-republish   : `name === 'article.md'` 固定 → 型別 article-*.md を走査せず
 *   - audit-note-cards       : 同上
 *   - check-note-live-headings: 全件取得失敗でも「✓ 不整合なし」
 *
 *   その陰で有料記事2本が無料プレビュー0字、送客リンク64件がライブでリンク切れのまま公開されていた。
 *
 * 本ゲートは個々の検査内容には立ち入らず、**ソース走査型ゲートが妥当な件数を拾えているか**
 * だけを見る。走査ロジックが壊れれば件数が急減するので、そこで気づける。
 *
 * 判定: 各ゲートを実行し、出力に現れる「検査した件数」を拾って期待下限と比較する。
 *   下限は「現状より大幅に少ない値」を置く（記事が減れば正当に下回るので、その時は下限を直す）。
 *
 * 使い方:
 *   node scripts/check-gate-coverage.mjs          # 全ゲートの検査件数を検証
 *   node scripts/check-gate-coverage.mjs --json
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';

const JSON_OUT = process.argv.includes('--json');

// network 不要でソースを走査するゲートのみ対象（live 系は取得失敗率を各自が見ている）。
const GATES = [
  {
    name: 'check-note-price-consistency',
    cmd: ['node', 'scripts/check-note-price-consistency.mjs'],
    // 「有料マガジン N 件の単品価格は…」
    re: /有料マガジン\s*(\d+)\s*件/,
    min: 25,
    note: '有料マガジン数。マガジン単位の走査が壊れると急減する',
  },
  {
    name: 'check-note-site-utm',
    cmd: ['node', 'scripts/check-note-site-utm.mjs'],
    // 成功時のみ「✓ N ファイルの…」が出る。違反があるとその行は出ないが、
    // 違反が列挙されている＝走査は動いている証拠なので coverage としては合格扱いにする。
    re: /✓\s*(\d+)\s*ファイル/,
    aliveRe: /規約違反のサイト送客リンク\s*\d+\s*件/,
    min: 100,
    note: 'note 記事ファイル数。パス判定が壊れると 0 になる（Windows で実際に起きた）',
  },
  {
    name: 'check-note-boundary',
    cmd: ['node', 'scripts/check-note-boundary.mjs', '--all'],
    re: /(\d+)\s*件/,
    min: 100,
    note: 'paid published 記事数',
  },
  {
    name: 'check-note-hashtags',
    cmd: ['node', 'scripts/check-note-hashtags.mjs'],
    // 成功時「✓ N 件の hashtags は…」/ 違反時は列挙されるので走査は生きている
    re: /✓\s*(\d+)\s*件の hashtags/,
    aliveRe: /タグ未満が\s*\d+\s*件/,
    min: 500,
    note: 'hashtags*.txt の数。walk() が壊れると 0 になる',
  },
];

const results = [];
for (const g of GATES) {
  const r = spawnSync(g.cmd[0], g.cmd.slice(1), { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const m = out.match(g.re);
  const count = m ? Number(m[1]) : null;
  // 違反を列挙している＝走査自体は生きている（件数は違反数であって検査数ではないので比較しない）
  const alive = Boolean(g.aliveRe && g.aliveRe.test(out));
  const ok = alive || (count != null && count >= g.min);
  results.push({ name: g.name, count, min: g.min, ok, alive, note: g.note, exit: r.status });
}

if (JSON_OUT) {
  console.log(JSON.stringify({ results }, null, 2));
  process.exit(results.every((x) => x.ok) ? 0 : 1);
}

const bad = results.filter((x) => !x.ok);
for (const x of results) {
  const mark = x.ok ? '✓' : '✗';
  const detail = x.alive
    ? '違反を列挙中＝走査は稼働（検査件数は未取得）'
    : `検査 ${x.count ?? '(件数を読み取れず)'} 件（下限 ${x.min}）`;
  console.log(`  ${mark} ${x.name}: ${detail}`);
}

if (bad.length) {
  console.error('\n[check-gate-coverage] ✗ 検査件数が下限を割ったゲートがあります:');
  for (const x of bad) console.error(`  - ${x.name}: ${x.count ?? '不明'} < ${x.min} … ${x.note}`);
  console.error('\nこれは「異常が無い」ではなく「ゲートが対象を拾えていない」可能性が高い。');
  console.error('  よくある原因: パス判定を join() の結果（Windows は "\\" 区切り）に対して行っている /');
  console.error('  note 記事の走査が article.md 固定で型別 article-*.md を落としている。');
  console.error('  記事数が正当に減ったのなら本スクリプトの min を下げる。');
  process.exit(1);
}
console.log(`[check-gate-coverage] ✓ ${results.length} ゲートすべてが妥当な件数を検査している`);
