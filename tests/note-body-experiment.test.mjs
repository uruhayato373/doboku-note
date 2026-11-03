// tests/note-body-experiment.test.mjs
//
// EXP-053（本文中の note 案内の画像／文字の A/B・DN-0949）の割り当て・ラベル・集計と、部品・CSS・<head> への配線を固定する。
// 守りたい事故: 両方の案が見える（表示が二重に数えられる）／JS が無いと何も見えない／案のラベルが読めず集計から漏れる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import {
  NOTE_BODY_VARIANT_KEY,
  NOTE_BODY_VARIANT_SCRIPT,
  assignNoteBodyVariant,
  noteBodyExperimentLabel,
  parseNoteBodyExperimentLabel,
} from '../src/lib/note-body-experiment.mjs';
import { summarizeNoteBodyExperiment } from '../scripts/lib/note-body-experiment-report.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

test('保存済みの案を使い、無ければ半々で決めて保存する。保存できなくても案は返る', () => {
  assert.equal(assignNoteBodyVariant(memory({ [NOTE_BODY_VARIANT_KEY]: 'text' })), 'text');
  const s = memory();
  assert.equal(assignNoteBodyVariant(s, () => 0.2), 'image');
  assert.equal(s.m.get(NOTE_BODY_VARIANT_KEY), 'image');
  assert.equal(assignNoteBodyVariant(memory(), () => 0.7), 'text');
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(assignNoteBodyVariant(broken, () => 0.9), 'text');
});

test('<head> のスクリプトは同じ鍵で案を決めて <html> に書き、localStorage が使えなくても止まらない', () => {
  for (const [stored, random, want] of [['text', 0.1, 'text'], [null, 0.1, 'image'], [null, 0.9, 'text']]) {
    const attrs = {};
    const store = memory(stored ? { [NOTE_BODY_VARIANT_KEY]: stored } : {});
    vm.runInNewContext(NOTE_BODY_VARIANT_SCRIPT, {
      localStorage: store,
      Math: { random: () => random },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    });
    assert.equal(attrs['data-note-body-variant'], want);
  }
  const attrs = {};
  vm.runInNewContext(NOTE_BODY_VARIANT_SCRIPT, {
    localStorage: { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } },
    Math: { random: () => 0.9 },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
  });
  assert.equal(attrs['data-note-body-variant'], 'text');
});

test('ラベルは案・置き場所・CTA ラベルを持ち、往復できる', () => {
  const label = noteBodyExperimentLabel('text', 'article-body', 'civil-2-pastexam-essay:secondary-r07-q1');
  assert.deepEqual(parseNoteBodyExperimentLabel(label), { experiment: 'EXP-053', variant: 'text', placement: 'article-body', ctaLabel: 'civil-2-pastexam-essay:secondary-r07-q1', productId: 'civil-2-pastexam-essay' });
  assert.equal(parseNoteBodyExperimentLabel('EXP-048:B:buildjob:article-mid'), null);
  assert.equal(parseNoteBodyExperimentLabel('EXP-053|photo|article-body|x:y'), null);
});

test('集計は案ごと・置き場所ごとに表示とクリックを合わせ、表示 0 の案はクリック率を出さない', () => {
  const rows = [
    { label: noteBodyExperimentLabel('image', 'article-body', 'a:x'), eventName: 'note_body_experiment_impression', eventCount: 200 },
    { label: noteBodyExperimentLabel('image', 'article-body', 'a:x'), eventName: 'note_body_experiment_click', eventCount: 2 },
    { label: noteBodyExperimentLabel('image', 'article-mid', 'b:y'), eventName: 'note_body_experiment_impression', eventCount: 100 },
    { label: 'a:x', eventName: 'note_cta_impression', eventCount: 999 },
  ];
  const s = summarizeNoteBodyExperiment(rows);
  assert.deepEqual(s.arms.find((a) => a.variant === 'image'), { variant: 'image', impressions: 300, clicks: 2, ctr: 2 / 300 });
  assert.deepEqual(s.arms.find((a) => a.variant === 'text'), { variant: 'text', impressions: 0, clicks: 0, ctr: null });
  assert.equal(s.byPlacement.length, 2);
});

test('部品は画像があるとき両方の案を描き、CSS が片方だけを隠し、<head> が割り当てを読み込む', () => {
  for (const f of ['src/components/ui/MagazineHeroCta/MagazineHeroCta.tsx', 'src/components/ui/MagazineInlineCard/MagazineInlineCard.tsx']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.match(src, /data-note-body-arm="image"/, f);
    assert.match(src, /data-note-body-arm="text"/, f);
  }
  const css = readFileSync(join(ROOT, 'src/styles/globals.css'), 'utf8');
  assert.match(css, /html:not\(\[data-note-body-variant="text"\]\) \[data-note-body-arm="text"\],\s*html\[data-note-body-variant="text"\] \[data-note-body-arm="image"\]\s*\{\s*display: none;/);
  assert.match(readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8'), /NOTE_BODY_VARIANT_SCRIPT/);
  const provider = readFileSync(join(ROOT, 'src/components/providers/AnalyticsProvider.tsx'), 'utf8');
  assert.match(provider, /note_body_experiment_impression/);
  assert.match(provider, /note_body_experiment_click/);
});
