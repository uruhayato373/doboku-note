#!/usr/bin/env node
/**
 * check-exam-day-pages.mjs — 近づいた試験日・合格発表日ごとに、当日ページの準備ができているかを出す（read-only）
 * ---------------------------------------------------------------------------
 * なぜ: 2026-10-25（2級土木 二次の試験日）に、事前に用意した当日ページ 1 本が 1 日で 3,764 クリックを取った。
 *   3 か月で最大の成果だったが、やり方は 1 回きりで、次の日付に向けて誰も見ていなかった（gsc-management.md 2026-11-11）。
 *
 * 対象: config/exam-calendar.json の試験日（kind exam）と合格発表日（kind result）のうち、今日から windowDays 日先まで、
 *   かつサイトに資格のページがある（content/site/<資格 id>/ がある）もの。
 * 対応表: config/exam-day-pages.json（資格 × 日付ごとに page・card・skip のどれか）。
 *
 * 状態:
 *   ready      当日ページの記事が公開されている
 *   missing    page を書いたのに記事が無い・非公開
 *   planned    作ると決めて起票済み（card）で、まだ page が無い
 *   skipped    作らないと決めた（skip の理由）
 *   undecided  対応表に無い（週次レビューで決める）
 *
 * 使い方:
 *   npm run check-exam-day-pages            # 人が読む出力（週次レビューが読む）
 *   npm run check-exam-day-pages -- --json
 *   npm run check-exam-day-pages -- --check # missing・undecided が 1 件でもあれば exit 1
 *
 * exit: 0 = 読めた（--check のときは要対応 0）/ 1 = --check で要対応あり / 2 = 設定が読めない（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { todayJst } from './lib/jst-date.mjs';

const DAY_MS = 86_400_000;
const KINDS = new Set(['exam', 'result']);

/** 今日から windowDays 日先までの、サイトに資格のページがある試験日・合格発表日（純関数） */
export function upcomingEvents(calendar, { today, windowDays, covered }) {
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + windowDays * DAY_MS).toISOString().slice(0, 10);
  const out = [];
  for (const [qualification, exam] of Object.entries(calendar.exams ?? {})) {
    if (!covered(qualification)) continue;
    for (const [event, v] of Object.entries(exam.events ?? {})) {
      const date = v.date ?? v.start ?? null;
      if (!date || !KINDS.has(v.kind) || date < today || date > end) continue;
      out.push({ qualification, event, date, label: v.label, kind: v.kind, daysLeft: Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS) });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.qualification.localeCompare(b.qualification));
}

/** 日付ごとの状態（純関数）。pageState(page) は 'published' | 'unpublished' | 'absent' */
export function judgeEvents(events, entries, pageState) {
  const byKey = new Map(entries.map((e) => [`${e.qualification}/${e.event}`, e]));
  return events.map((ev) => {
    const entry = byKey.get(`${ev.qualification}/${ev.event}`);
    if (!entry) return { ...ev, status: 'undecided' };
    if (entry.skip) return { ...ev, status: 'skipped', skip: entry.skip };
    if (entry.page) {
      const state = pageState(entry.page);
      return { ...ev, status: state === 'published' ? 'ready' : 'missing', page: entry.page, pageState: state, card: entry.card ?? null };
    }
    return { ...ev, status: 'planned', card: entry.card };
  });
}

function pageStateOf(page) {
  const file = join(SITE_CONTENT_ROOT, ...page.split('/'), 'article.mdx');
  if (!existsSync(file)) return 'absent';
  const { data } = matter(readFileSync(file, 'utf8'));
  return data.published === false ? 'unpublished' : 'published';
}

const LABEL = { ready: '準備済み', missing: '記事が無い・非公開', planned: '起票済み・未作成', skipped: '作らない', undecided: '未判断' };

function main() {
  const flags = parseCliArgs({ json: { type: 'boolean', default: false }, check: { type: 'boolean', default: false } });
  let calendar;
  let config;
  try {
    calendar = readDataset(REPO_ROOT, 'config.exam-calendar');
    config = readDataset(REPO_ROOT, 'config.exam-day-pages');
  } catch (error) {
    console.error(`[check-exam-day-pages] 設定が読めない: ${error.message} — 検査不成立`);
    return 2;
  }
  const today = todayJst();
  const events = upcomingEvents(calendar, { today, windowDays: config.windowDays, covered: (q) => existsSync(join(SITE_CONTENT_ROOT, q)) });
  const rows = judgeEvents(events, config.entries, pageStateOf);
  const actionable = rows.filter((r) => r.status === 'missing' || r.status === 'undecided');
  if (flags.json) {
    console.log(JSON.stringify({ today, windowDays: config.windowDays, events: rows, actionable: actionable.length }, null, 2));
  } else {
    console.log(`[check-exam-day-pages] ${today} から ${config.windowDays} 日先まで / 試験日・合格発表日 ${rows.length} 件 / 要対応 ${actionable.length} 件`);
    for (const r of rows) {
      const detail = r.page ? `  ${r.page}` : r.card ? `  ${r.card}` : r.skip ? `  ${r.skip}` : '  → 週次レビューで page・card・skip を決めて対応表（台帳 config.exam-day-pages）に書く';
      console.log(`  ${r.date}（あと ${r.daysLeft} 日）${r.qualification} ${r.label}: ${LABEL[r.status]}${detail}`);
    }
  }
  return flags.check && actionable.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main();
}
