import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

// 2026-08-17: `parse-exam-questions.mjs` の YEAR_PATTERN が h30 を落としていたため
// SoT が 16年度640問のまま止まり、その 640 が **IG カルーセル CTA スライドの実描画値**
// （instagram-carousel-tokens.json の slides.cta.stats）へ焼かれて出荷されていた。
// 数字の一致を人の目視に頼らない。

const countQuestions = (cfg) =>
  (cfg.years ?? []).reduce((a, y) => a + (y.questions?.length ?? 0), 0);

test('総監の SoT は 40問/年度で欠年がない（年度パターンの取りこぼし検知）', () => {
  const cfg = read('src/config/exam-questions.json');
  assert.ok(cfg.years.length > 0, '年度が 0 件（パーサ故障の疑い）');
  for (const y of cfg.years) {
    assert.equal(y.questions.length, 40, `${y.year} の問数が 40 でない: ${y.questions.length}`);
  }
  // h21 から連続していること（h30 のような境界年度が落ちると穴が開く）
  const years = cfg.years.map((y) => y.year).sort();
  const expected = [
    ...Array.from({ length: 10 }, (_, i) => `h${21 + i}`),
    ...Array.from({ length: years.length - 10 }, (_, i) => `r0${i + 1}`),
  ];
  assert.deepEqual(years, expected, '年度が連続していない（YEAR_PATTERN の取りこぼしを疑う）');
});

test('IG カルーセル CTA の「N問」が総監 SoT の実問数と一致する', () => {
  const total = countQuestions(read('src/config/exam-questions.json'));
  const tokens = read('.claude/knowledge/design-system/instagram-carousel-tokens.json');
  const practice = tokens.slides.cta.stats.find((s) => s.label === 'PRACTICE');
  assert.ok(practice, 'CTA スライドに PRACTICE stat が無い');
  assert.equal(
    Number(practice.num),
    total,
    `CTA が ${practice.num}問 と描画するが SoT は ${total}問（新年度追加後にトークン未更新）`,
  );
});
