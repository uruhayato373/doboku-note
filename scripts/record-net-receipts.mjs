#!/usr/bin/env node
/**
 * record-net-receipts.mjs — 月の受取額（NSM・netReceipts）を 3 つの台帳から組み立てて事業の計測記録に書く（月次レビューの手順）。
 *
 * 台帳は土曜の Mac 収集（weekly-collect）が更新する。ここはブラウザを開かず、資格情報も使わない（2026-10-11 に台帳読みへ変更）。
 * - note: data/note/sales.json の月の net（売上管理の月別詳細の手数料控除後売上。note-sales-fetch が確定後に読む）
 * - ココナラ: data/coconala/revenue.json の売上履歴（手数料控除後・クローズ日で計上。coconala-revenue が読む）
 * - KDP: data/kdp/royalties.json の catalog 対象書籍（kdp-report。翌月 16 日以降に取った値だけ確定）
 * 組み立ては scripts/lib/net-receipts.mjs の monthReceipts（管理画面のトップと同じ実装）。記録は npm run business-review -- record。
 * 3 つとも確定のときだけ complete。台帳に無い値は --note-net・--coconala で渡せる（画面で読んだ値を人が渡すとき）。
 *
 * 使い方:
 *   npm run record-net-receipts -- --month 2026-09            # dry-run（記録しない）
 *   npm run record-net-receipts -- --month 2026-09 --commit   # 記録する（data/business/records/ に書くだけ・git commit はしない）
 * 同じ月を記録済みなら、その記録を訂正先（supersedes）にして取り直す。complete の月を partial で上書きはしない（exit 1）。
 * 終了コード: 0＝組み立てた（partial を含む）/ 1＝complete の月を partial で上書きしようとした
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildNetReceiptsMeasurement, netReceiptsSupersedes } from './lib/net-receipts.mjs';
import { loadMonthReceipts } from './lib/net-receipts-ledger.mjs';
import { currentRecords, records } from './lib/business-direction.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[record-net-receipts]';
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const MONTH = arg('--month');
const COMMIT = argv.includes('--commit');
if (!/^\d{4}-\d{2}$/.test(MONTH ?? '')) {
  console.error(`${TAG} --month YYYY-MM が必要`);
  process.exit(1);
}

function main() {
  const receipts = loadMonthReceipts(ROOT, MONTH);
  const ch = Object.fromEntries(receipts.channels.map((c) => [c.id, c]));
  for (const c of receipts.channels) console.log(`${TAG}   ${c.label}: ${c.value == null ? '—' : `¥${c.value.toLocaleString('ja-JP')}`}（${c.status}${c.asOf ? `・${c.asOf} 取得` : ''}）${c.note}`);
  const noteNet = arg('--note-net') != null ? Number(arg('--note-net')) : ch.note.status === 'final' ? ch.note.value : null;
  const note = noteNet == null ? null : { gross: ch.note.gross ?? null, fee: ch.note.fee ?? null, net: noteNet };
  const coconala = arg('--coconala') != null ? Number(arg('--coconala')) : ch.coconala.status === 'final' ? ch.coconala.value : null;
  const kdp = ch.kdp.value == null ? null : { royalty: ch.kdp.value, estimated: ch.kdp.status !== 'final' };
  const record = buildNetReceiptsMeasurement({ month: MONTH, note, coconala, kdp });
  // 同じ月を記録済みなら訂正先にする（partial → complete の取り直し。履歴は残る）
  const prior = netReceiptsSupersedes(currentRecords(records(ROOT), 'measurement'), record);
  if (prior.error) {
    console.error(`${TAG} 記録しない: ${prior.error}`);
    return 1;
  }
  if (prior.supersedes) record.supersedes = prior.supersedes;

  console.log(`${TAG} ${MONTH}: note ${note?.net ?? '—'} / ココナラ ${coconala ?? '—'} / KDP ${kdp ? `${kdp.royalty}${kdp.estimated ? '（推計）' : ''}` : '—'} → 受取額 ${record.values.netReceipts ?? '—'}（${record.coverage}）${record.supersedes ? ` 訂正先 ${record.supersedes}` : ''}`);
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const input = join(ROOT, '.tmp', `net-receipts-${MONTH}.json`);
  writeFileSync(input, JSON.stringify(record, null, 2) + '\n');
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/business-review.mjs'), 'record', '--input', input, ...(COMMIT ? ['--commit'] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  process.stdout.write(out);
  return 0;
}

process.exitCode = main();
