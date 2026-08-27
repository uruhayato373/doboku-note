#!/usr/bin/env node
// 本番の SSR が生きているかを、誤読できない形で検証する。
//
// なぜスクリプトにするか（2026-08-27 の踏み間違い）:
//   deploy 後の検証を手打ちの curl でやったとき `curl --noproxy '*'` を付けていて、
//   会社 PC のプロキシを自分で外していたため外部へ出られず `HTTP 000 / <main 0 件` が
//   返った。これを危うく「デプロイ失敗・SSR 破壊」と報告しかけた。
//   **接続できていないことは、サイトが壊れている証拠ではない。**
//   同じ形の誤読は skill の散文では防げなかったので、判定をコードに落とす。
//
// 判定の分け方（CLAUDE.md §9「検査ゼロを PASS と呼ばない」の対称形）:
//   exit 0 … 200 かつ <main あり かつ 主要キーワードあり
//   exit 1 … 実際に壊れている（200 でない / <main 0 / キーワード 0）
//   exit 2 … **検査不成立**（接続できていない）。合格でも不合格でもない
//
// 使い方:
//   node scripts/check-production-ssr.mjs                 # 既定 2 URL
//   node scripts/check-production-ssr.mjs --url https://…  # 個別指定（複数可）
//   node scripts/check-production-ssr.mjs --json
//
// 注意: fetch ではなく curl を使う。会社 PC では Node の fetch がプロキシを使えず
//   全滅する（measurement-incidents.md）。`--noproxy` は**付けない**——付けると
//   このスクリプト自身が上の事故を再現する。

import { execFileSync } from 'node:child_process';

export const DEFAULT_URLS = ['https://doboku-note.pages.dev', 'https://doboku-note.com'];
export const KEYWORDS = ['土木', '技術士'];

/**
 * 1 URL 分の判定（純関数・テストから使う）。
 * @param {{url:string, code:string, body:string}} r
 * @returns {{url:string, level:'ok'|'fail'|'unreachable', reason:string, mains:number, keywords:number}}
 */
export function classify(r) {
  const mains = (r.body.match(/<main[\s>]/g) ?? []).length;
  const keywords = KEYWORDS.reduce((n, k) => n + (r.body.split(k).length - 1), 0);

  // 000 = curl が接続そのものに失敗。プロキシ未経由・DNS・遮断などで、
  // サイトの状態については何も分かっていない。
  if (!r.code || r.code === '000') {
    return { url: r.url, level: 'unreachable', reason: '接続できていない（HTTP 000）', mains, keywords };
  }
  if (r.code !== '200') {
    return { url: r.url, level: 'fail', reason: `HTTP ${r.code}`, mains, keywords };
  }
  if (mains === 0) {
    // `<main>` で完全一致 grep すると class 付きの実出力に当たらず必ず 0 になる。
    // ここは `<main` の前方一致で数えている（deploy skill の偽赤メモと同じ理由）。
    return { url: r.url, level: 'fail', reason: 'SSR 破壊の疑い（<main が 0 件）', mains, keywords };
  }
  if (keywords === 0) {
    return { url: r.url, level: 'fail', reason: '主要キーワードが 0 件（中身が空の可能性）', mains, keywords };
  }
  return { url: r.url, level: 'ok', reason: `HTTP 200 / <main ${mains} 件 / KW ${keywords} 件`, mains, keywords };
}

function fetchViaCurl(url) {
  // --noproxy は付けない（付けると会社 PC で必ず 000 になる）。
  const args = ['-s', '--ssl-no-revoke', '--max-time', '30', '-w', '\\n__CODE__%{http_code}', url];
  try {
    const out = execFileSync('curl', args, { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const i = out.lastIndexOf('\n__CODE__');
    if (i < 0) return { url, code: '000', body: out };
    return { url, code: out.slice(i + '\n__CODE__'.length).trim(), body: out.slice(0, i) };
  } catch {
    return { url, code: '000', body: '' };
  }
}

function main() {
  const NAME = 'check-production-ssr';
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const urls = [];
  for (let i = 0; i < argv.length; i += 1) if (argv[i] === '--url' && argv[i + 1]) urls.push(argv[i + 1]);
  const targets = urls.length > 0 ? urls : DEFAULT_URLS;

  const results = targets.map((u) => classify(fetchViaCurl(u)));
  const unreachable = results.filter((r) => r.level === 'unreachable');
  const failed = results.filter((r) => r.level === 'fail');

  if (asJson) {
    console.log(JSON.stringify({ targets: targets.length, results }, null, 2));
  } else {
    console.log(`[${NAME}] ${targets.length} URL を実検査`);
    for (const r of results) {
      const mark = r.level === 'ok' ? '✓' : r.level === 'fail' ? '✗' : '?';
      console.log(`  ${mark} ${r.url} — ${r.reason}`);
    }
  }

  if (unreachable.length > 0) {
    console.error(`\n[${NAME}] 検査不成立: ${unreachable.length}/${targets.length} URL へ接続できていない。`);
    console.error('  これは「サイトが壊れている」ではない。合格・不合格のどちらとしても報告しないこと。');
    console.error('  会社 PC でよくある原因: curl に --noproxy を付けている（プロキシを自分で外している）。');
    console.error('  切り分け: curl -s -o /dev/null -w "%{http_code}" --ssl-no-revoke <URL>');
    return 2;
  }
  if (failed.length > 0) {
    console.error(`\n[${NAME}] ✗ ${failed.length}/${targets.length} URL が異常`);
    console.error('  500 のときは Cloudflare API token の期限切れを仮説 1 番に確認する（GitHub Secrets で再発行）。');
    console.error('  <main が 0 のときは SSR 破壊。ユーザーへ即報告し .claude/todo/backlog.md へ起票する。');
    return 1;
  }
  console.log(`[${NAME}] ✓ ${targets.length} URL すべてが HTTP 200・<main あり・キーワードあり`);
  return 0;
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('check-production-ssr.mjs')) {
  process.exit(main());
}
