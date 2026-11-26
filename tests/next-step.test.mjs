import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// ガイド末の「次の一歩」は資格ページの節（#sec-…）へ送る。資格ページに無い節を指さない（1級の #sec-fields・2026-11-15）。
// 節が出るのは、その記事型の公開記事がある資格だけ。分野別（fields）は category-curriculum の fields がある資格だけ。
const { resolveNextSteps } = await loadTsModule('src/lib/next-step.ts');
const curriculum = JSON.parse(readFileSync(join(ROOT, 'src/config/category-curriculum.json'), 'utf8'));
const docs = Object.values(JSON.parse(readFileSync(join(ROOT, 'src/config/doc-meta-index.json'), 'utf8')).docs).filter((d) => d.published !== false);
const GROUP_ALIASES = { pastExam: ['pastExam', 'past-exam'] };

test('次の一歩の節は、資格ページに実在する節だけ', () => {
  const categories = [...new Set(docs.map((d) => d.category))];
  let checked = 0;
  for (const category of categories) {
    for (const step of resolveNextSteps(category)) {
      const anchor = step.href.split('#sec-')[1];
      checked += 1;
      if (anchor === 'fields') {
        assert.ok(curriculum[category]?.fields, `${category}: #sec-fields を指すが分野別の節が無い`);
      } else {
        const groups = GROUP_ALIASES[anchor] ?? [anchor];
        assert.ok(docs.some((d) => d.category === category && groups.includes(d.group)), `${category}: #sec-${anchor} の記事が無い`);
      }
    }
  }
  assert.ok(checked >= 15, `検査した節 ${checked} 件`);
});

// 第2次検定（記述）のガイドは第1次の過去問・分野別の要点ではなく第2次検定の節へ（2026-11-26・2級の採点ガイドが第1次検定の過去問へ送っていた）
test('第2次検定の塊のガイドは #sec-secondary を先頭にし、第1次の過去問・分野別へは送らない', () => {
  const docs = Object.entries(JSON.parse(readFileSync(join(ROOT, 'src/config/doc-meta-index.json'), 'utf8')).docs).map(([slug, d]) => ({ slug, ...d })).filter((d) => d.published !== false);
  for (const category of ['civil-construction-1', 'civil-construction-2']) {
    const block = curriculum[category]?.fields?.blocks?.find((b) => b.id === 'secondary');
    const slugs = (block?.slugs ?? []).map((s) => `${category}-${s}`).filter((slug) => docs.some((d) => d.slug === slug));
    if (category === 'civil-construction-2') assert.ok(slugs.length >= 3, `${category}: 第2次検定の塊のガイド ${slugs.length} 件`);
    for (const slug of slugs) {
      const anchors = resolveNextSteps(category, docs, slug).map((s) => s.href.split('#sec-')[1]);
      assert.equal(anchors[0], 'secondary', `${slug}: ${anchors}`);
      assert.ok(!anchors.includes('primary') && !anchors.includes('fields'), `${slug}: ${anchors}`);
      assert.ok(docs.some((d) => d.category === category && d.group === 'secondary'), `${category}: #sec-secondary の記事が無い`);
    }
  }
  const firstStage = resolveNextSteps('civil-construction-2', docs, 'civil-construction-2-guide-earthwork-key-points').map((s) => s.href.split('#sec-')[1]);
  assert.equal(firstStage[0], 'primary');
});
