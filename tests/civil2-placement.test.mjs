// 2級土木のサイト note CTA 配線（magazine-placement.ts）の意図を固定する。
//   - 二次の冒頭 CTA は試験日（config/exam-calendar.json）までは直前総仕上げパック、翌日から二次まるごと
//   - 冒頭を譲った二次まるごとは、年度別ページの中間 CTA で面を持ち続ける
//   - 経験記述の書き方・例文の冒頭は完成答案集（EXP-014・2026-10-02）
//   - 重要ポイント 5 本（2026-09-30 公開）は試験系ガイドとして精読ガイドを冒頭に出す
// 実 resolvePlacement を esbuild でトランスパイルして呼ぶ（note-membership-funnel.test.mjs と同じ方式）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function loadPlacement() {
  const ts = readFileSync(ROOT + 'src/lib/magazine-placement.ts', 'utf8');
  const js = buildSync({
    stdin: { contents: ts, loader: 'ts', resolveDir: ROOT + 'src/lib' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  return import('data:text/javascript,' + encodeURIComponent(js));
}

const calendar = JSON.parse(readFileSync(ROOT + 'config/exam-calendar.json', 'utf8'));
const examDate = calendar.exams['civil-construction-2'].events.second.date;
const examDayStartMs = Date.parse(`${examDate}T00:00:00+09:00`);

test('resolveCivil2SecondaryLead: 試験当日までは直前パック、翌日から二次まるごと', async () => {
  const { resolveCivil2SecondaryLead } = await loadPlacement();
  assert.equal(resolveCivil2SecondaryLead(examDayStartMs - 1), 'civil-2-chokuzen-pack');
  assert.equal(resolveCivil2SecondaryLead(examDayStartMs + 86_400_000 - 1), 'civil-2-chokuzen-pack');
  assert.equal(resolveCivil2SecondaryLead(examDayStartMs + 86_400_000), 'civil-2-niji-marugoto-pack');
});

test('2級 年度別ページ: 冒頭は季節の主 CTA、中間（inline 先頭で top と別）に二次まるごとが残る', async () => {
  const { resolvePlacement, resolveMidNoteSlot, resolveCivil2SecondaryLead } = await loadPlacement();
  const p = resolvePlacement('civil-construction-2-secondary-r07', 'secondary');
  assert.equal(p.top?.magazineId, resolveCivil2SecondaryLead());
  const ids = [p.top, ...p.inline].map((s) => s.magazineId);
  assert.ok(ids.includes('civil-2-niji-marugoto-pack'), '二次まるごとが年度別ページから消えている');
  const mid = resolveMidNoteSlot(p);
  assert.ok(mid, '中間 CTA が無い');
  assert.notEqual(mid.magazineId, p.top?.magazineId);
});

test('2級 経験記述の書き方・例文: 冒頭は完成答案集', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const slug of [
    'civil-construction-2-secondary-experience-writing-guide',
    'civil-construction-2-secondary-experience-writing-examples',
  ]) {
    assert.equal(resolvePlacement(slug, 'secondary').top?.magazineId, 'civil-2-experience-essay', slug);
  }
});

test('2級 重要ポイント（専門土木 5 本）: 精読ガイドを冒頭に出す', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const name of [
    'guide-dam-tunnel-key-points',
    'guide-river-sabo-key-points',
    'guide-road-pavement-key-points',
    'guide-structures-key-points',
    'guide-water-sewer-key-points',
  ]) {
    const p = resolvePlacement(`civil-construction-2-${name}`, 'guide');
    assert.equal(p.top?.magazineId, 'civil-2-reading-guide', name);
  }
});
