#!/usr/bin/env node
/**
 * report-qualification-market.mjs — 資格ごとの展開の判断材料を一覧する（月次レビュー・展開判断が読む）
 * ---------------------------------------------------------------------------
 * 並べるもの: 出題形式（自分の答案を組み立てる区分か）・その区分の受験者数・買われる時期・自社の売上・
 * YouTube / note / ココナラの混み具合（強い売り手の数）・X / Instagram の追跡数。
 * 組み立ては scripts/lib/qualification-market.mjs（管理画面 資格一覧「展開の判断」と同じ実装）。
 *
 *   npm run qualification-market             # Markdown の表と要対応
 *   npm run qualification-market -- --json   # JSON
 *   npm run qualification-market -- --check  # 完走だけ確かめる（quality-audit ci）
 * 要対応（市場スキャンの未取得・古さ、出題形式の未確認）があっても exit 0。資格を 1 件も組めないときだけ exit 1。
 * ---------------------------------------------------------------------------
 */
import { loadMarketInputs } from './lib/market-inputs.mjs';
import { buildMarketView } from './lib/qualification-market.mjs';
import { todayJst } from './lib/jst-date.mjs';

const args = new Set(process.argv.slice(2));
for (const a of args) {
  if (!['--json', '--check'].includes(a)) {
    console.error(`ERROR: 未知の引数 ${a}（--json / --check）`);
    process.exit(2);
  }
}
const view = buildMarketView({ ...loadMarketInputs(process.cwd()), today: todayJst() });
if (view.rows.length === 0) {
  console.error('[qualification-market] 資格を 1 件も組めなかった（検査不成立）');
  process.exit(1);
}
const actionCount = view.rows.reduce((n, r) => n + r.actions.length, 0);

if (args.has('--check')) {
  console.log(`[qualification-market] OK: ${view.rows.length} 資格を集計・要対応 ${actionCount} 件`);
} else if (args.has('--json')) {
  process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
} else {
  const D = { none: '無', low: '少', mid: '中', high: '多' };
  const types = (s) => s.types.map((t) => view.formatTypes[t] ?? t).join('・');
  const ch = (c) => (c?.density ? `${D[c.density]} ${c.strong}${c.partial ? '*' : ''}` : '—');
  const yen = (n) => (n ? `¥${Math.round(n).toLocaleString('ja-JP')}` : '—');
  const order = { active: 0, candidate: 1, declined: 2 };
  const rows = [...view.rows].sort((a, b) => order[a.portfolio] - order[b.portfolio] || (b.composeExaminees ?? -1) - (a.composeExaminees ?? -1));
  const out = [`# 資格の展開の判断材料（${view.today}）`, '', '混み具合は強い売り手の数（market-scan.json の閾値）。YouTube・note・ココナラは検索で測り、X・Instagram は追跡数。ココナラの * は資格専用の検索語が未取得で、汎用の検索結果から数えた下限。', ''];
  out.push('| 資格 | 状態 | 出題形式 | 記述の受験者 | 売上 | YouTube | note | ココナラ | X | IG |', '|---|---|---|---:|---:|---|---|---|---:|---:|');
  for (const r of rows) {
    const fmt = r.stages.map((s) => `${s.label}: ${types(s)}`).join(' / ') || '—';
    out.push(`| ${r.label} | ${r.portfolio} | ${fmt} | ${r.composeExaminees?.toLocaleString('ja-JP') ?? '—'} | ${yen(r.salesYen)} | ${ch(r.channels.youtube)} | ${ch(r.channels.note)} | ${ch(r.channels.coconala)} | ${r.channels.x.tracked.length} | ${r.channels.ig.tracked.length} |`);
  }
  out.push('', '## 要対応', '');
  for (const r of rows.filter((x) => x.actions.length)) out.push(`- **${r.label}**: ${r.actions.join(' ／ ')}`);
  if (actionCount === 0) out.push('なし');
  console.log(out.join('\n'));
}
