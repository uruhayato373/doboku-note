// ビルド成果物の整理の意図: 読まれないファイルだけを除き、noindex は検索の入口にせず、上限の手前で止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIndexableHtml } from '../scripts/build-search-index.mjs';
import { isRemovedFromOutput, MAX_OUTPUT_FILES } from '../scripts/slim-build-output.mjs';
import { mergedChapterRedirectRules } from '../scripts/lib/standards-part-targets.mjs';
import { isMergedChapterDocument } from '../src/lib/standards-chapter-merge.mjs';

test('除くのは _full と章データだけで、予備のルート .txt と一覧の JSON は残す', () => {
  assert.ok(isRemovedFromOutput('exam/x/__next._full.txt'));
  assert.ok(isRemovedFromOutput('standards-data/kinki/common/chapters/1-1.md'));
  assert.ok(isRemovedFromOutput('standards-data/kinki/common/chapters/1-1.jsonld'));
  for (const kept of ['exam/x.txt', 'exam/x/__next._tree.txt', 'standards-data/catalog.json', 'standards-data/kinki/common/index.json', 'standards-data/kinki/common/index.jsonld']) {
    assert.equal(isRemovedFromOutput(kept), false, kept);
  }
  assert.ok(MAX_OUTPUT_FILES < 20_000);
});

test('noindex のページは検索の索引へ入れない', () => {
  assert.equal(isIndexableHtml('<head><meta name="robots" content="noindex, follow"/></head><body>x</body>'), false);
  assert.equal(isIndexableHtml('<head><meta name="robots" content="index, follow"/></head><body>noindex</body>'), true);
});

test('章をまとめるのは近畿版と本文が同じ文書だけ', () => {
  const comparison = { rows: [{ agencyId: 'chubu', documentId: 'common', status: 'identical' }, { agencyId: 'shikoku', documentId: 'common', status: 'different' }] };
  assert.equal(isMergedChapterDocument(comparison, 'chubu', 'common'), true);
  assert.equal(isMergedChapterDocument(comparison, 'shikoku', 'common'), false);
  assert.deepEqual(mergedChapterRedirectRules(comparison), ['/standards/chubu/common/chapters/* /standards/kinki/common/chapters/:splat 301']);
});
