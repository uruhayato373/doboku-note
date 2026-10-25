#!/usr/bin/env node
/**
 * fetch-note-public-view-shots.mjs — 土曜の収集（weekly-collect の note-public-view 段）が撮った目視確認用の画像を、レビューの作業ツリーへ写す。
 *
 * 週次レビュー（土曜・ローカル・/weekly-review）で、エージェントが note 公開ページの見た目を画像で確かめる
 * ための入口。判定は収集の段が数値で済ませており、ここで写すのは「数値では決められない見た目の崩れ」を見る材料。
 * 収集とレビューは別の作業ツリーで動くので、撮影は手元の置き場（scripts/lib/note-public-view.mjs の NOTE_PUBLIC_VIEW_LOCAL_DIR）にあり、
 * それを .tmp/note-public-view-review/<撮影日>/ へ写して、review/index.json（代表ページ × ブレイクポイントごとの画面幅）の件数を出す。
 * 2026-10-26 までは CI（note-public-view.yml）の成果物を gh で取り寄せていた（DN-0852）。
 *
 * 使い方: node scripts/fetch-note-public-view-shots.mjs [--json] [--from <撮影の置き場>]
 * 終了コード: 0 = 全ページ×画面幅がそろっている / 2 = 撮影が無い・古い（8 日超）・撮影に欠けがある（未確認として扱う）
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { jstDayOf } from './lib/jst-date.mjs';
import { NOTE_PUBLIC_VIEW_LOCAL_DIR } from './lib/note-public-view.mjs';
import { reviewCoverage } from './lib/public-view-browser.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

/** 土曜から次の土曜までに 1 日の余裕。これより古い撮影は「今週の画面」と呼ばない */
export const MAX_SHOT_AGE_DAYS = 8;

/** 撮影の古さ（日）。読めなければ null（pure） */
export function shotAgeDays(generatedAt, now = Date.now()) {
  const t = Date.parse(generatedAt ?? '');
  return Number.isFinite(t) ? (now - t) / 86_400_000 : null;
}

/** 置き場の下の review/index.json をすべて探す（note。SNS を再開したら YouTube も同じ形で並ぶ） */
function findIndexes(d, acc = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) findIndexes(p, acc);
    else if (e.name === 'index.json' && d.endsWith('review')) acc.push(p);
  }
  return acc;
}

function main() {
  const JSON_OUT = process.argv.includes('--json');
  const fromIdx = process.argv.indexOf('--from');
  const src = fromIdx >= 0 ? process.argv[fromIdx + 1] : NOTE_PUBLIC_VIEW_LOCAL_DIR;
  const fail = (msg) => { console.error(`[fetch-note-public-view-shots] 未確認: ${msg}`); process.exit(2); };

  if (!existsSync(src)) fail(`撮影の置き場 ${src} が無い（土曜の収集の note-public-view 段がまだ回っていない）`);
  const reportPath = join(src, 'report.json');
  let report = null;
  try { report = JSON.parse(readFileSync(reportPath, 'utf8')); } catch { /* 無ければ更新時刻で古さを見る */ }
  const generatedAt = report?.generatedAt ?? (existsSync(reportPath) ? statSync(reportPath).mtime.toISOString() : null);
  const age = shotAgeDays(generatedAt);
  if (age === null) fail(`${reportPath} が無い（撮影が途中で止まった可能性）`);
  if (age > MAX_SHOT_AGE_DAYS) fail(`撮影が ${Math.floor(age)} 日前（${generatedAt}）で古い。土曜の収集の note-public-view 段を確認する（取り直しは node scripts/weekly-collect.mjs --only note-public-view）`);
  if (!findIndexes(src).length) fail(`${src} に review/index.json が無い（撮影 0 枚）`);

  const dir = join(ROOT, '.tmp/note-public-view-review', jstDayOf(generatedAt));
  rmSync(dir, { recursive: true, force: true });
  cpSync(src, dir, { recursive: true });
  const services = findIndexes(dir).map((p) => {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const pages = j.pages || [];
    return {
      service: j.service || 'note',
      reviewDir: dirname(p),
      pages: pages.length,
      viewports: (j.viewports || []).map((v) => v.width),
      shots: pages.reduce((n, pg) => n + (pg.shots?.length || 0), 0),
      missingShots: pages.filter((pg) => !pg.shots?.length).length,
      coverage: reviewCoverage(j, (file) => existsSync(join(dirname(p), file))),
      breakpointDrift: j.breakpoints?.drift || null,
    };
  });
  const summary = { capturedAt: generatedAt, bad: report?.bad?.length ?? null, warn: report?.warn?.length ?? null, services };
  if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
  else for (const s of services) console.log(`[fetch-note-public-view-shots] ${summary.capturedAt} の撮影 ${s.service}: ${s.pages} ページ × ${s.viewports.length} 画面幅・撮影成立 ${s.coverage.captured}/${s.coverage.expected}・${s.shots} 枚 → ${s.reviewDir}${s.coverage.complete ? '' : '（未確認の画面あり）'}`);
  if (services.some((s) => !s.coverage.complete)) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
