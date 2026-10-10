#!/usr/bin/env node
/**
 * sync-past-exam-ledger — 過去問の問題台帳（data/pastexams/questions/{資格}.json）を演習データと在庫台帳に合わせ、照合の結果を書き込む（DN-0647）。
 *
 *   node scripts/sync-past-exam-ledger.mjs                       # 計画だけ（足す行・配線が変わる行・孤児の数）
 *   node scripts/sync-past-exam-ledger.mjs --write               # 書く（照合・正答の記録は残す）
 *   node scripts/sync-past-exam-ledger.mjs --write --prune       # 演習データから消えた ID の行も消す
 *   node scripts/sync-past-exam-ledger.mjs --exam civil-construction-2 --write
 *   node scripts/sync-past-exam-ledger.mjs --apply results.json --write
 *       照合の結果を書く。results.json は [{ qualification, id, page?, transcription?: { status, note? }, answer?: { status, official?, note? }, checkedAt, by }]
 *   node scripts/sync-past-exam-ledger.mjs --import-keys keys.json --exam civil-construction-1 --by import --checked-at 2026-07-10 --write
 *       記事単位の公式正答の配列（{ "h26-a": [4,1,…] }）を公式正答として取り込む（1級一次の旧 .claude/state の写しの移し替え用）
 *
 * exit 0 = 成功（計画だけも含む） / exit 1 = 演習データ・在庫台帳が読めない、ID の形を読めない、--apply の行が台帳に無い
 */
import { readFileSync } from 'node:fs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { LEDGER_EXAMS, LEDGER_ID, enumerateQuestions, readInventory, readLedger, syncRows } from './lib/past-exam-ledger.mjs';

const NAME = 'sync-past-exam-ledger';
const args = parseCliArgs({
  exam: { type: 'string' },
  write: { type: 'boolean' },
  prune: { type: 'boolean' },
  apply: { type: 'string' },
  'import-keys': { type: 'string' },
  by: { type: 'string', default: 'import' },
  'checked-at': { type: 'string' },
});

const targets = args.exam ? [args.exam] : Object.keys(LEDGER_EXAMS);
for (const t of targets) if (!LEDGER_EXAMS[t]) { console.error(`[${NAME}] 対象でない資格: ${t}（${Object.keys(LEDGER_EXAMS).join('・')}）`); process.exit(1); }

const inventory = readInventory();
const ledgers = new Map();
let failed = false;

for (const qualification of targets) {
  const cfg = LEDGER_EXAMS[qualification];
  const questions = await enumerateQuestions(qualification);
  if (!questions.length) { console.error(`[${NAME}] ${qualification}: 演習データが 0 問（読み取りの失敗）`); failed = true; continue; }
  const prev = readLedger(qualification);
  const { rows, added, orphans, rewired } = syncRows({ qualification, questions, inventoryExam: inventory.exams[qualification], existing: prev?.questions || [] });
  const kept = args.prune ? [] : (prev?.questions || []).filter((r) => orphans.includes(r.id));
  ledgers.set(qualification, { schemaVersion: 1, qualification, quizExam: cfg.quizExam, questions: [...rows, ...kept] });
  const noQ = rows.filter((r) => !r.source.question).length;
  const noA = rows.filter((r) => !r.source.answer).length;
  console.log(`[${NAME}] ${qualification}: 演習データ ${questions.length} 問 / 台帳 ${rows.length + kept.length} 行（追加 ${added.length}・配線の更新 ${rewired.length}・孤児 ${orphans.length}${args.prune ? ' を削除' : ' を残す'}）/ 原典なし 問題 ${noQ}・正答 ${noA}`);
}

if (args.importKeys) {
  if (targets.length !== 1) { console.error(`[${NAME}] --import-keys は --exam を 1 つ指定する`); process.exit(1); }
  if (!args.checkedAt) { console.error(`[${NAME}] --import-keys には --checked-at（公式正答を確かめた日）が要る`); process.exit(1); }
  const keys = JSON.parse(readFileSync(args.importKeys, 'utf8'));
  const ledger = ledgers.get(targets[0]);
  let n = 0;
  for (const r of ledger.questions) {
    const m = /^(.*)-(\d{2})$/.exec(r.id);
    const arr = m && keys[m[1]];
    const v = arr?.[Number(m[2]) - 1];
    if (v == null) continue;
    r.answer = { status: 'official', official: [v], checkedAt: args.checkedAt, by: args.by, note: '2026-07-10 に JCTC 公式正答肢の再掲から抽出した旧データ（1級一次）から移した' };
    n++;
  }
  console.log(`[${NAME}] 公式正答を ${n} 問に取り込んだ`);
}

if (args.apply) {
  const results = JSON.parse(readFileSync(args.apply, 'utf8'));
  let n = 0;
  for (const res of results) {
    const ledger = ledgers.get(res.qualification);
    const row = ledger?.questions.find((r) => r.id === res.id);
    if (!row) { console.error(`[${NAME}] --apply: ${res.qualification}/${res.id} が台帳に無い`); failed = true; continue; }
    const stamp = { checkedAt: res.checkedAt, by: res.by || 'agent' };
    if (res.page != null) row.source.page = res.page;
    if (res.transcription) row.transcription = { status: res.transcription.status, ...stamp, ...(res.transcription.note ? { note: res.transcription.note } : {}) };
    if (res.answer) {
      row.answer = res.answer.status === 'official'
        ? { status: 'official', official: res.answer.official, ...stamp, ...(res.answer.note ? { note: res.answer.note } : {}) }
        : { status: res.answer.status, official: null, ...stamp, ...(res.answer.note ? { note: res.answer.note } : {}) };
    }
    n++;
  }
  console.log(`[${NAME}] 照合の結果 ${n}/${results.length} 件を反映した`);
}

if (failed) process.exit(1);
if (!args.write) {
  console.log(`[${NAME}] 計画だけ（書くには --write）`);
  process.exit(0);
}
for (const [qualification, ledger] of ledgers) {
  writeDataset(REPO_ROOT, LEDGER_ID, ledger, { values: { name: qualification } });
}
console.log(`[${NAME}] ${ledgers.size} 資格の問題台帳を書いた`);
