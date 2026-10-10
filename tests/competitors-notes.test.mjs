import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// config/competitors.json の note は「性格」（何者か・導線・同一主体・競合する自社商品）だけを書く。
// 価格・販売数・フォロワー数・日付などの観測値は、取得のたびに data/*/competitors/{date}.json へ入る。
// note に書くと実測と二重になり、実測が更新されても取り残されて古びる（2026-10-02 に 38 件で見つかった）。
const cfg = JSON.parse(readFileSync(join(ROOT, 'config/competitors.json'), 'utf8'));

const OBSERVATION = [
  [/[¥￥]\s*[\d,]/, '金額'],
  [/\d{4}-\d{2}-\d{2}|\d{4}\/\d{1,2}\/\d{1,2}/, '日付'],
  [/(?:販売|followers?|tweets)\s*[\d,]+/i, '販売数・フォロワー数・投稿数'],
  [/[\d,]+\s*(?:記事|マガジン|サービス|出品|フォロワー|名超|部超|人\b|F\b)/, '件数'],
  [/(?:\d+時点|報道\))/, '時点'],
];

test('競合リストの note に、価格・販売数・フォロワー数・日付などの観測値を書かない（検査対象 0 件を合格にしない）', () => {
  const entries = ['note', 'coconala', 'instagram', 'x', 'youtube'].flatMap((ch) => (cfg[ch]?.competitors ?? []).map((c) => ({ ch, ...c })));
  assert.ok(entries.length >= 90, `競合の件数が少なすぎる（読み取りの破損を疑う）: ${entries.length}`);
  const bad = [];
  for (const c of entries) {
    for (const [re, what] of OBSERVATION) if (re.test(c.note ?? '')) bad.push(`${c.ch} ${c.handle}（${what}）: ${c.note}`);
  }
  assert.deepEqual(bad, [], '観測値は data/*/competitors/ の実測へ。note には性格だけを書く');
});
