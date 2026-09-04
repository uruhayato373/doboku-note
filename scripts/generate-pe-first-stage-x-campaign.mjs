#!/usr/bin/env node
// 技術士第一次試験を1日1本ずつ差し込むX月次オーバーレイ計画を生成する。
// 他資格を含む全体3本/日計画とは分離し、同一URL・販売投稿の連打を避ける。

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const month = process.argv[2] || '2026-10';
if (!/^\d{4}-\d{2}$/.test(month)) {
  console.error('Usage: node scripts/generate-pe-first-stage-x-campaign.mjs [YYYY-MM]');
  process.exit(1);
}
const [year, monthNumber] = month.split('-').map(Number);
const days = new Date(year, monthNumber, 0).getDate();
const quizUrl = 'https://doboku-note.com/tools/kakomon-quiz/pe-first-stage';
const noteUrl = 'https://note.com/dobokunote/n/n466132e6fd74';
const noteDays = new Set([2, 9, 16, 23, 30]);
const siteDays = new Set([3, 7, 12, 17, 21, 26, 31]);
const slotTimes = {
  A: ['07:10', '07:35', '08:05', '08:25'],
  B: ['12:10', '12:25', '12:40', '12:55'],
  C: ['19:30', '19:55', '20:25', '20:50'],
};
const topics = [
  '基礎科目・設計計画', '適性科目・技術士法', '専門科目・土質基礎', '基礎科目・情報論理',
  '適性科目・技術者倫理', '専門科目・構造コンクリート', '3科目の時間配分', '間違い復習',
];
const posts = [];
for (let day = 1; day <= days; day++) {
  const date = `${month}-${String(day).padStart(2, '0')}`;
  const topic = topics[(day - 1) % topics.length];
  if (noteDays.has(day)) {
    const target = new URL(noteUrl);
    target.searchParams.set('utm_source', 'x');
    target.searchParams.set('utm_medium', 'social');
    target.searchParams.set('utm_campaign', `pe-first-stage-${month}`);
    target.searchParams.set('utm_content', `${month.replace('-', '')}-${String(day).padStart(2, '0')}-note`);
    posts.push({ date, time: slotTimes.C[day % slotTimes.C.length], slot: 'C', exam: 'pe-first-stage', type: 'A4過去問PDF', funnel: 'note', target: target.toString(), image: null, topic });
  } else if (siteDays.has(day)) {
    const target = new URL(quizUrl);
    target.searchParams.set('utm_source', 'x');
    target.searchParams.set('utm_medium', 'social');
    target.searchParams.set('utm_campaign', `pe-first-stage-${month}`);
    target.searchParams.set('utm_content', `${month.replace('-', '')}-${String(day).padStart(2, '0')}`);
    posts.push({ date, time: slotTimes.B[day % slotTimes.B.length], slot: 'B', exam: 'pe-first-stage', type: '過去問1問1答', funnel: 'site', target: target.toString(), image: null, topic });
  } else {
    posts.push({ date, time: slotTimes.A[day % slotTimes.A.length], slot: 'A', exam: 'pe-first-stage', type: day % 2 ? '引っかけ集' : '暗記フレーズ', funnel: 'linkless', target: null, image: null, topic });
  }
}
const plan = {
  schemaVersion: 2,
  month,
  objective: '11月22日の技術士第一次試験へ向け、無料560問演習を主入口に認知・保存・再訪を積み上げる',
  coverage: { from: `${month}-01`, to: `${month}-${String(days).padStart(2, '0')}`, perDay: 1 },
  guardrails: ['URL付きは12/31本（note 5・site 7）まで', '販売投稿は夜枠のみ', '時刻は帯内で分散', '各投稿はクイズJSONの異なる論点から執筆'],
  posts,
};
const outDir = resolve(ROOT, '.claude/config/x-campaigns');
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, `${month}-pe-first-stage.json`);
writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`[pe1-x] ${out.slice(ROOT.length + 1)}: ${posts.length} posts`);
