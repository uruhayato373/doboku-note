#!/usr/bin/env node
/**
 * 過去問の在庫台帳（data/pastexams/inventory.json）を検査する。
 *
 * 公式の過去問は「直近 N 年度だけ掲載」が多く、取り逃した年度は二度と手に入らない。
 * 台帳は資格×年度×ファイルの在庫（公式掲載の有無・入手元・取得日）を持ち、PDF 本体は
 * content/sources/past-exams/{資格}/{年度}/ に置いて Drive vault（past-exam-source-pdf＝原資料PDF/過去問/）へ退避する。
 *
 * FAIL（exit 1）= 台帳の不整合（壁時計に依存しない）:
 *   資格 id が exam-formats.json に無い / パスが Drive の textbook-source-pdf に当たらない /
 *   取得済みなのに Drive 台帳にも手元にも実体が無い（CI では手元を見ないので対象外）
 * WARN（exit 0）= 取得の催促（読み手＝/monthly-review 手順4）:
 *   公式掲載中なのに未取得 / うち最古年度は次の更新で消える見込み / 取得済みだが Drive 未退避 /
 *   試験日＋掲載までの日数を過ぎたのに今年度の行が無い
 * exit 2 = 検査不成立（台帳が読めない・対象 0 件）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadDriveConfig, loadDriveManifest, driveGroupFor } from './lib/drive-vault.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';

const NAME = 'check-past-exam-inventory';
const INVENTORY_PATH = datasetPath('pastexams.inventory');
const DRIVE_GROUP = 'past-exam-source-pdf';
const OFFICIAL = ['listed', 'removed', 'never', 'unknown'];
const KINDS = ['question', 'answer']; // 公式の問題と正答・解答例だけ。第三者の解答・解説・模擬試験は教材側（過去問解説/）
const DAY = 86_400_000;

/** 検査本体（純関数）。fileExists=null は手元の実体を見ない（CI）。 */
export function evaluateInventory({ inventory, formats, calendar, manifest, driveCfg, today, fileExists = null }) {
  const fails = [];
  const warns = [];
  const stats = { exams: 0, years: 0, files: 0, acquired: 0, inDrive: 0, localChecked: 0 };
  const entries = manifest?.entries || {};
  for (const [id, exam] of Object.entries(inventory.exams || {})) {
    stats.exams++;
    const at = (msg) => `${id}: ${msg}`;
    // registry:false は保存だけが目的の試験（技術士の他部門・都道府県の採用試験など）。資格台帳には載せず label で名乗る
    if (exam.registry === false) {
      if (!String(exam.label || '').trim()) fails.push(at('registry:false の試験は label が要る'));
    } else if (!formats.exams?.[id]) fails.push(at('exam-formats.json に無い資格 id（保存だけの試験なら registry:false と label）'));
    const dir = String(exam.dir || '');
    if (!/^content\/sources\/past-exams\/[^/]+$/.test(dir)) fails.push(at(`dir は content/sources/past-exams/{資格} の形にする（${dir || '未設定'}）`));
    const seenYears = new Set();
    const examYears = new Set(); // 問題（question）の行がある年度
    const listedMissing = [];
    for (const y of exam.years || []) {
      stats.years++;
      const yl = `${id} ${y.year}`;
      if (!Number.isInteger(y.year) || seenYears.has(y.year)) fails.push(`${yl}: year は重複しない西暦の整数`);
      seenYears.add(y.year);
      if (y.official === 'never' || (y.files || []).some(f => f.kind === 'question')) examYears.add(y.year);
      if (!OFFICIAL.includes(y.official)) fails.push(`${yl}: official は ${OFFICIAL.join('/')} のどれか（${y.official}）`);
      for (const f of y.files || []) {
        stats.files++;
        const rel = posix.join(dir, String(f.file || ''));
        const fl = `${yl} ${f.file}`;
        if (!KINDS.includes(f.kind)) fails.push(`${fl}: kind は ${KINDS.join('/')}`);
        if (!/\.pdf$/.test(rel) || driveGroupFor(rel, driveCfg, { includePending: false })?.id !== DRIVE_GROUP) {
          fails.push(`${fl}: Drive の ${DRIVE_GROUP} に当たらないパス（${rel}）`);
          continue;
        }
        if (f.sourceUrl != null && !/^https:\/\//.test(f.sourceUrl)) fails.push(`${fl}: sourceUrl は https`);
        // 固定した原典の検証値（任意）。付けるなら SHA-256 とページ数を揃える（片方だけだと取得時の照合が効かない）
        if (f.sha256 != null && !/^[a-f0-9]{64}$/.test(f.sha256)) fails.push(`${fl}: sha256 は 64 桁の 16 進`);
        if (f.pages != null && !(Number.isInteger(f.pages) && f.pages > 0)) fails.push(`${fl}: pages は正の整数`);
        if ((f.sha256 == null) !== (f.pages == null)) fails.push(`${fl}: sha256 と pages は両方書く（固定した原典の検証値）`);
        if (!f.acquiredAt) {
          if (y.official === 'listed') listedMissing.push({ year: y.year, label: fl });
          continue;
        }
        stats.acquired++;
        if (entries[rel]?.group === DRIVE_GROUP) { stats.inDrive++; continue; }
        if (fileExists === null) { warns.push(`${fl}: 取得済みだが Drive 台帳に未登録（CI は手元を見ない）`); continue; }
        stats.localChecked++;
        if (fileExists(rel)) warns.push(`${fl}: 手元にだけある。Drive へ退避する（/past-exam-archive の退避手順）`);
        else fails.push(`${fl}: 取得済みと書いたのに Drive 台帳にも手元にも無い`);
      }
    }
    if (listedMissing.length) {
      const oldest = Math.min(...listedMissing.map(m => m.year));
      for (const m of listedMissing) {
        warns.push(`${m.label}: 公式掲載中なのに未取得${m.year === oldest && exam.official?.windowYears ? '（最古の掲載年度＝次の更新で消える見込み）' : ''}`);
      }
    }
    const cal = calendar.exams?.[id];
    const examDate = Object.values(cal?.events || {}).filter(e => e.kind === 'exam' && e.date).map(e => e.date).sort()[0];
    const lag = exam.official?.publishLagDays;
    if (cal && examDate && Number.isInteger(lag) && !examYears.has(cal.year)
      && today.getTime() >= Date.parse(examDate + 'T00:00:00+09:00') + lag * DAY) {
      warns.push(`${id}: ${cal.year} 年度の試験（${examDate}）から ${lag} 日を過ぎた。公式掲載を確かめて年度の行を足す（${exam.official?.page || '掲載ページ未設定'}）`);
    }
  }
  return { fails, warns, stats };
}

function main() {
  let inventory, formats, calendar, driveCfg, manifest;
  try {
    inventory = JSON.parse(readFileSync(join(REPO_ROOT, INVENTORY_PATH), 'utf8'));
    formats = readDataset(REPO_ROOT, 'config.exam-formats');
    calendar = readDataset(REPO_ROOT, 'config.exam-calendar');
    driveCfg = loadDriveConfig();
    manifest = loadDriveManifest();
  } catch (e) {
    console.error(`[${NAME}] 検査不成立: ${e.message}`);
    process.exit(2);
  }
  const ci = Boolean(process.env.CI);
  const { fails, warns, stats } = evaluateInventory({
    inventory, formats, calendar, manifest, driveCfg, today: new Date(),
    fileExists: ci ? null : (rel) => existsSync(join(REPO_ROOT, rel)),
  });
  console.log(`[${NAME}] 資格 ${stats.exams} / 年度 ${stats.years} / ファイル ${stats.files}（取得済み ${stats.acquired}・Drive 登録 ${stats.inDrive}・手元を検査 ${ci ? '0（CI）' : stats.localChecked}）`);
  for (const w of warns) console.log(`  WARN ${w}`);
  for (const f of fails) console.error(`  FAIL ${f}`);
  if (stats.exams === 0) { console.error(`[${NAME}] 検査不成立: 対象の資格が 0 件`); process.exit(2); }
  if (fails.length) { console.error(`[${NAME}] FAIL ${fails.length} 件（WARN ${warns.length} 件）`); process.exit(1); }
  console.log(`[${NAME}] OK（WARN ${warns.length} 件）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
