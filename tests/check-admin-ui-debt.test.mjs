import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countDebt, compare } from '../scripts/check-admin-ui-debt.mjs';

test('className の単語 "card" だけを数え、card-grid などの別クラスは数えない', () => {
  const src = [
    '<div className="card">',
    '<div className="card warn-border">',
    "<div className='muted card'>",
    '<div className={`card ${x}`}>',
    '<div className="card-grid">',
    '<Card className="gap-0">',
  ].join('\n');
  assert.equal(countDebt(src).rawCard, 4);
});

test('style={{ の出現を数える', () => {
  assert.equal(countDebt('<a style={{ margin: 0 }} /><b style={{a:1}} /><c style={s} />').inlineStyle, 2);
});

test('基準値より増えたページと、基準値に無い新規ページの 1 件以上を回帰にする', () => {
  const baseline = { 'a.tsx': { rawCard: 2, inlineStyle: 3 } };
  const current = { 'a.tsx': { rawCard: 3, inlineStyle: 1 }, 'new.tsx': { rawCard: 0, inlineStyle: 1 } };
  const { regressions, improvements } = compare(current, baseline);
  assert.deepEqual(regressions.map((r) => [r.file, r.key, r.isNew]), [['a.tsx', 'rawCard', false], ['new.tsx', 'inlineStyle', true]]);
  assert.deepEqual(improvements.map((i) => [i.file, i.key]), [['a.tsx', 'inlineStyle']]);
});

test('基準値どおりなら回帰なし', () => {
  const b = { 'a.tsx': { rawCard: 1, inlineStyle: 1 } };
  assert.deepEqual(compare(JSON.parse(JSON.stringify(b)), b), { regressions: [], improvements: [] });
});
