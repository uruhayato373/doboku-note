#!/usr/bin/env node
/**
 * check-past-exam-ledger — 過去問の問題台帳（data/pastexams/questions/{資格}.json）と演習データ・在庫台帳・記事の配線、
 * 演習データの正答と公式正答の一致を検査する（DN-0647）。演習データの無い資格（測量士・測量士補・コンクリート主任技士）は記事の MDX の見出しと「正答：N」を演習データの代わりに読む（DN-1085）。
 *
 *   node scripts/check-past-exam-ledger.mjs            # 台帳の対象資格すべて（LEDGER_EXAMS）
 *   node scripts/check-past-exam-ledger.mjs --json     # 機械向け（管理画面・週次が読む）
 *   node scripts/check-past-exam-ledger.mjs --exam civil-construction-1
 *
 * FAIL（CI で止める・結果は diff だけで決まる）:
 *   - 演習データ（または記事の MDX）の問題 ID が台帳に無い／台帳の ID がそこに無い（ID の消失はアプリの学習履歴を消す）
 *   - 記事が無い・原典のファイルが在庫台帳に無い
 *   - 公式正答を確かめた問題で、演習データの正答が公式と違う
 *   - 原典が無いのに転記を照合済みと記録している
 * 件数（照合の進み具合）は FAIL にしない。資格ごとに対象数・検査数・照合済み・未照合・原典なしを出す。
 * exit 0 = FAIL 0 / exit 1 = FAIL あり、または検査した問題が 0 件（検査不成立）
 *
 * npm run check-past-exam-ledger — 過去問の問題台帳（data/pastexams/questions/{資格}.json）の配線（問題 ID の過不足・記事・原典の実在）と、演習データの正答と公式正答の一致を FAIL。転記の照合率は件数だけ出す（--json は管理画面向け）。罠: civil-1・civil-2 は src/config の JSON を読むので、記事の MDX だけ直しても演習データが古いと不一致が残る。演習データの無い測量士・測量士補・コンクリート主任技士は記事の MDX の見出しと「正答：N」を直接読む（主任技士の正答は公式の表が手元に無く、過去問解説書の「出題当時」の正解で照合した。DN-1085）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { LEDGER_EXAMS, enumerateQuestions, evaluateLedger, readInventory, readLedger } from './lib/past-exam-ledger.mjs';

const NAME = 'check-past-exam-ledger';
const args = parseCliArgs({ exam: { type: 'string' }, json: { type: 'boolean' } });
const targets = args.exam ? [args.exam] : Object.keys(LEDGER_EXAMS);

const inventory = readInventory();
const report = [];
for (const qualification of targets) {
  if (!LEDGER_EXAMS[qualification]) { console.error(`[${NAME}] 対象でない資格: ${qualification}`); process.exit(1); }
  const questions = await enumerateQuestions(qualification);
  const ledger = readLedger(qualification);
  const { fails, stats, mismatches } = evaluateLedger({ qualification, ledger, questions, inventoryExam: inventory.exams[qualification] });
  report.push({ qualification, quizExam: LEDGER_EXAMS[qualification].quizExam, stats, fails, mismatches });
}

const totalFails = report.reduce((n, r) => n + r.fails.length, 0);
const totalChecked = report.reduce((n, r) => n + r.stats.checked, 0);

if (args.json) {
  process.stdout.write(JSON.stringify({ checked: totalChecked, fails: totalFails, exams: report }, null, 2) + '\n');
} else {
  for (const r of report) {
    const s = r.stats;
    console.log(`[${NAME}] ${r.qualification}: 演習データ ${s.questions} 問・台帳 ${s.rows} 行を検査 ${s.checked}`);
    console.log(`  転記の照合: 済 ${s.transcriptionDone} / 未了 ${s.transcriptionUnverified} / 原典なし ${s.transcriptionNoSource}`);
    console.log(`  公式正答: 確認済み ${s.answerOfficial}（不一致 ${s.answerMismatch}）/ 公式なし ${s.answerNoOfficial} / 未確認 ${s.answerUnchecked}`);
    console.log(`  原典の配線: 問題 PDF なし ${s.sourceQuestionMissing} / 正答 PDF なし ${s.sourceAnswerMissing}`);
    for (const f of r.fails.slice(0, 30)) console.log(`  FAIL ${f}`);
    if (r.fails.length > 30) console.log(`  … ほか ${r.fails.length - 30} 件`);
  }
  console.log(`[${NAME}] ${targets.length} 資格・${totalChecked} 問を検査 / FAIL ${totalFails} 件`);
}

if (totalChecked === 0) {
  console.error(`[${NAME}] 検査した問題が 0 件（検査不成立）`);
  process.exitCode = 1;
} else if (totalFails > 0) process.exitCode = 1;
