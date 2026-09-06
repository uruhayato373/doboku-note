/**
 * 参考文献の台帳（reference-sources.json）と、その使い方の判定のテスト。
 * 実際の Drive も R2 も触らない（純関数と、リポジトリ内の設定だけ）。
 *
 * 守りたい事故:
 *   A. **書名の自由文字列が残る** — 版・表記が揺れて機械で追えなくなる（「主任技師」「主任技士」）。
 *   B. **class の取り違え** — 市販書籍を公的基準と同じ扱いにして逐語を公開する。
 *   C. **逐語の見落とし** — 文字起こしから写した文が、句読点や空白の違いで検出をすり抜ける。
 *   D. **必須化の緩み** — appliesTo に一致する記事の sources 欠落が、baseline に足されて増えていく。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  loadReferenceSources, buildSourceIndex, expandCatalogSources, resolveSourceRef, splitSourceRef,
  classRuleOf, globToRegExp, sourcesRequiringArticle, normalizeForCompare, buildTranscriptIndex,
  findVerbatimRuns, parseTranscriptHeader, loadStandardsCatalog, VERBATIM_RULES, CITATION_RULES,
} from '../scripts/lib/reference-sources.mjs';

const CFG = loadReferenceSources();
const CATALOG = loadStandardsCatalog();
const IDX = buildSourceIndex(CFG, { catalog: CATALOG });
const src = (id) => CFG.sources.find((s) => s.id === id);

test('config: class は 6 区分すべてが verbatim / citation の語彙内で、市販書籍だけが逐語禁止', () => {
  assert.ok(Object.keys(CFG.classes).length >= 5, 'class が少なすぎる＝検査不成立');
  for (const [name, c] of Object.entries(CFG.classes)) {
    assert.ok(VERBATIM_RULES.includes(c.verbatim), name);
    assert.ok(CITATION_RULES.includes(c.citation), name);
    assert.ok(c.note.length >= 20, name + ' の note');
  }
  assert.equal(CFG.classes['commercial-book'].verbatim, 'forbidden');
  assert.equal(CFG.classes['commercial-book'].figureReuse, false);
  assert.equal(CFG.classes['commercial-book'].transcriptPublic, false);
  assert.equal(CFG.classes['public-standard'].verbatim, 'allowed');
  assert.equal(CFG.classes['public-standard'].citation, 'page', '公的基準は版面ページまで示す');
  assert.equal(CFG.classes['exam-official'].verbatim, 'question-only', '過去問は問題文だけ');
});

test('config: 全 source の id が kebab-case で一意、class と origin が実在する', () => {
  assert.ok(CFG.sources.length >= 20, 'source が少なすぎる＝検査不成立');
  const seen = new Set();
  for (const s of CFG.sources) {
    assert.match(s.id, /^[a-z0-9][a-z0-9-]*$/, s.id);
    assert.ok(!seen.has(s.id), '重複 ' + s.id);
    seen.add(s.id);
    assert.ok(CFG.classes[s.class], s.id + ' の class');
    assert.ok(['drive', 'catalog', 'external', 'none'].includes(s.origin.kind), s.id);
  }
  // スキャン教材が公的基準として登録されていない（B の逆側の固定）
  assert.equal(src('concrete-chief-textbook-2024').class, 'commercial-book');
  assert.equal(src('civil-practice-note').class, 'commercial-book');
  assert.equal(src('pe-construction-keyword-book').class, 'operator-owned', '運営者が権利を持つ書籍は別区分');
  assert.equal(src('cecc-past-exams').class, 'exam-official');
});

test('alias: 旧表記は解決できるが ok にならない（記事側を正しい参照へ直させる）', () => {
  const cases = [
    ['コンクリート標準示方書 施工編', 'jsce-concrete-spec-construction'],
    ['労働安全衛生規則第240条', 'labor-safety-rules#第240条'],
    ['JIS A 5308', 'jis#A 5308'],
    ['土木工事共通仕様書', 'std:kinki/common'],
  ];
  for (const [old, want] of cases) {
    const r = resolveSourceRef(old, IDX);
    assert.equal(r.ok, false, old + ' は旧表記なので ok にしない');
    assert.equal(r.suggest, want, old);
  }
  assert.equal(resolveSourceRef('jis#A 5308', IDX).ok, true);
  assert.equal(resolveSourceRef('std:kinki/common', IDX).ok, true, 'catalog 展開した公的基準も参照できる');
  const miss = resolveSourceRef('存在しない書名', IDX);
  assert.equal(miss.ok, false);
  assert.equal(miss.suggest, null, '当てずっぽうの候補を出さない');
});

test('splitSourceRef: 条番号・規格番号は # の後ろに置く', () => {
  assert.deepEqual(splitSourceRef('labor-safety-rules#第240条'), { id: 'labor-safety-rules', detail: '第240条' });
  assert.deepEqual(splitSourceRef('jis'), { id: 'jis', detail: null });
  assert.deepEqual(splitSourceRef(' jis#A 5308 '), { id: 'jis', detail: 'A 5308' });
});

test('catalog 展開: 72 文書が std:{整備局}/{文書} として引け、原本 sha256 を持つ', () => {
  const expanded = expandCatalogSources(CFG, CATALOG);
  assert.ok(expanded.length >= 10, 'catalog 展開が 0 件＝検査不成立');
  const kinki = expanded.find((s) => s.id === 'std:kinki/common');
  assert.ok(kinki, 'std:kinki/common');
  assert.equal(kinki.class, 'public-standard');
  assert.match(kinki.origin.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(classRuleOf(kinki, IDX).citation, 'page');
});

test('appliesTo: 原本由来の記事だけが必須になり、ガイド記事を巻き込まない', () => {
  const req = (p) => sourcesRequiringArticle(p, CFG).map((s) => s.id);
  assert.deepEqual(req('content/site/civil-practice/asphalt-pavement-control/article.mdx'), ['civil-practice-note']);
  assert.ok(req('content/site/concrete-chief-engineer/primary-materials/article.mdx').includes('concrete-chief-textbook-2024'));
  assert.deepEqual(req('content/site/civil-construction-1/guide-age-career/article.mdx'), [], 'キャリア系ガイドは原本由来でない');
  assert.deepEqual(req('content/site/pe-comprehensive-management/keyword-x/article.mdx'), [], '総監キーワードは今回の射程外（DN-0178）');
  assert.deepEqual(req('content/site/standards-articles/kinki/common/chapters/1/index.md'), [], '章記事は生成物で SourceRef を持つ');
});

test('globToRegExp: * は / を跨がず、** は跨ぐ', () => {
  assert.ok(globToRegExp('content/site/a/*/article.mdx').test('content/site/a/b/article.mdx'));
  assert.ok(!globToRegExp('content/site/a/*/article.mdx').test('content/site/a/b/c/article.mdx'));
  assert.ok(globToRegExp('content/site/a/**/x.mdx').test('content/site/a/b/c/x.mdx'));
  assert.ok(globToRegExp('content/site/a/primary-*/article.mdx').test('content/site/a/primary-materials/article.mdx'));
  assert.ok(!globToRegExp('content/site/a/primary-*/article.mdx').test('content/site/a/guide-x/article.mdx'));
});

test('normalizeForCompare: 空白・記号・コードブロック・ページ注釈の違いで逐語が隠れない', () => {
  const a = normalizeForCompare('コンクリートの　打込み速度は、\n1.0〜1.5 m/h を標準とする。');
  const b = normalizeForCompare('コンクリートの打込み速度は1.0〜1.5m/hを標準とする');
  assert.equal(a, b, '空白・句読点の違いは落とす');
  assert.equal(normalizeForCompare('前\n```\n表 A B C\n```\n後'), '前後', 'コードブロックは比較対象外');
  assert.equal(normalizeForCompare('前<!-- p.12 -->後'), '前後', 'ページ境界コメントは落とす');
});

test('findVerbatimRuns: 40 字以上の写しを見つけ、言い換えは拾わない（C）', () => {
  const transcript = 'あ'.repeat(5) + '締固め度は最大乾燥密度に対する現場乾燥密度の比で表し、盛土の品質規定方式ではこの値を管理値として用いる。試験施工で決めた締固め回数を本施工へ反映する。' + 'い'.repeat(5);
  const index = buildTranscriptIndex([{ key: 'note.md', source: 'civil-practice-note', text: transcript }]);
  const copied = '前置きの文。締固め度は最大乾燥密度に対する現場乾燥密度の比で表し、盛土の品質規定方式ではこの値を管理値として用いる。あとがき。';
  const hits = findVerbatimRuns(copied, index, { minRun: 40 });
  assert.equal(hits.length >= 1, true, '写した文が検出できない');
  assert.ok(hits[0].run >= 40, '一致長 ' + hits[0].run);
  assert.equal(hits[0].key, 'note.md');
  assert.equal(hits[0].source, 'civil-practice-note');

  const paraphrased = '締固めの程度は、現場で測った乾燥密度を室内試験の最大値と比べた割合で判断する。品質規定方式ではその割合に下限を置き、試験施工で回数を決めておく。';
  assert.deepEqual(findVerbatimRuns(paraphrased, index, { minRun: 40 }), [], '言い換えは逐語ではない');

  // 表記を崩しても検出できる（正規化が効いている）
  const disguised = '締固め度は、最大乾燥密度に対する 現場乾燥密度の比で表し、盛土の品質規定方式では この値を管理値として用いる。';
  assert.ok(findVerbatimRuns(disguised, index, { minRun: 40 }).length >= 1, '空白・読点を足しただけの写しをすり抜けさせない');
});

test('findVerbatimRuns: 種の間隔より長い共通部分を取りこぼさない', () => {
  const body = '設計基準強度を下回らないよう配合強度に割増しを与える手順は現場ごとの品質のばらつきから決める。';
  const index = buildTranscriptIndex([{ key: 't.md', text: 'X'.repeat(37) + body + 'Y'.repeat(41) }], { seed: 20, stride: 10 });
  const hits = findVerbatimRuns('前' + body + '後', index, { minRun: 40 });
  assert.equal(hits.length, 1);
  assert.ok(hits[0].run >= normalizeForCompare(body).length - 1);
});

test('parseTranscriptHeader: 新形式の frontmatter と旧形式の `> 出典:` 行の両方を読む', () => {
  const fm = parseTranscriptHeader('---\nsource: concrete-chief-textbook-2022\npdfPages: "135-141"\nprintedPages: "278-291"\nmethod: visual-ocr\nsourcePdfs:\n  - content/sources/textbook/x/a.pdf\n---\n\n# 本文\n');
  assert.equal(fm.kind, 'frontmatter');
  assert.equal(fm.source, 'concrete-chief-textbook-2022');
  assert.equal(fm.pdfPages, '135-141');
  assert.deepEqual(fm.sourcePdfs, ['content/sources/textbook/x/a.pdf']);

  const legacy = parseTranscriptHeader('# 平成24年度 全問題と解答\n\n> 出典: コンクリート主任技師2022.pdf（PDF p.135-141 / 本ノンブル 278-279〜290-291）をOCR文字起こし。\n');
  assert.equal(legacy.kind, 'legacy');
  assert.equal(legacy.pdfFile, 'コンクリート主任技師2022.pdf');
  assert.equal(legacy.pdfPages, '135-141');
  assert.equal(legacy.printedPages, '278-279〜290-291');

  assert.equal(parseTranscriptHeader('# 見出しだけ\n\n本文。\n').kind, 'none');
});

test('config: 文字起こしを持つ原本は transcriptDir が repo 相対で、市販書籍は公開しない設定になっている', () => {
  const withT = CFG.sources.filter((s) => s.transcriptDir);
  assert.ok(withT.length >= 5, '文字起こしを持つ原本が少なすぎる＝検査不成立');
  for (const s of withT) {
    assert.ok(s.transcriptDir.startsWith('content/sources/'), s.id);
    const rule = CFG.classes[s.class];
    if (s.class === 'commercial-book') assert.equal(rule.transcriptPublic, false, s.id + ' の文字起こしは公開しない');
  }
});
