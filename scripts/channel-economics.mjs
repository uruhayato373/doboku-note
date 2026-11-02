#!/usr/bin/env node
/**
 * channel-economics.mjs — 販売チャネル（note・KDP・ココナラ）ごとの月別の手取り・1 件あたりの手取り・資格別・KPI の実績を出す。
 * 組み立ては scripts/lib/channel-economics.mjs（管理画面 戦略＞資格と市場＞チャネル設計 と同じ実装）。正本は config/channel-strategy.json。
 * 月別の受取は net-receipts.mjs（管理画面のトップと同じ）。1 件あたりの note の手取りは確定月の実績の控除後の割合で出す。
 *
 *   npm run channel-economics            表で出す
 *   npm run channel-economics -- --json  機械向け
 */
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { buildChannelView } from './lib/channel-economics.mjs';

const flags = parseCliArgs({ json: { type: 'boolean' } });
const view = buildChannelView(REPO_ROOT);
const yen = (n) => (n == null ? '未計測' : `¥${Math.round(n).toLocaleString('ja-JP')}`);

if (flags.json) {
  process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
} else {
  const st = { final: '確定', 'to-date': '途中', estimate: '推計', missing: '未取得' };
  console.log(`[channel-economics] KGI ${view.kgi.label} 目標 ${yen(view.kgi.targetYen)} / ${view.kgi.lastFullMonth} は ${yen(view.kgi.lastFullTotal)}${view.kgi.lastFullComplete ? '' : '（欠けあり）'}`);
  console.log(`note の控除後の割合（確定月の実績）: ${view.noteKeepActual == null ? '未取得' : `${(view.noteKeepActual * 100).toFixed(1)}%`}`);
  console.log('\n月別の受取（net-receipts と同じ組み立て）');
  for (const m of view.monthly) console.log(`  ${m.month}  note ${yen(m.note)}（${st[m.status.note]}）  KDP ${yen(m.kdp)}（${st[m.status.kdp]}）  ココナラ ${yen(m.coconala)}（${st[m.status.coconala]}）  計 ${yen(m.total)}`);
  console.log('\n1 件あたりの手取り');
  for (const u of view.unit) console.log(`  ${u.item}  平均 ${yen(u.avgPrice)} → 手取り ${yen(u.netPerSale)}${u.estimated ? '（公表料率で推計）' : ''}${u.sales ? `・${u.sales} 件` : ''}`);
  console.log(`\nココナラ（${view.coconala.period ?? '期間不明'}）: 出品中 ${view.coconala.listed}・休止 ${view.coconala.paused} / 閲覧 ${view.coconala.views ?? '未計測'}・お気に入り ${view.coconala.favorites ?? '未計測'}・受注 ${view.coconala.orders ?? '未計測'} / 最後の売上 ${view.coconala.lastRevenueAt ?? 'なし'}`);
  console.log('\nKPI（status が proposed は承認前）');
  for (const k of view.kpis) console.log(`  [${k.status}] ${k.label}: 目標 ${k.target}${k.unit} / 実績 ${k.actual ?? '未計測'}${k.actual != null ? k.unit : ''}${k.actualAt ? `（${k.actualAt}）` : ''}`);
}
