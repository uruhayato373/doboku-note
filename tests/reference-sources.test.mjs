/**
 * 参考文献の台帳（reference-sources.json）と、その使い方の判定のテスト。
 * 実際の Drive も R2 も触らない（純関数と、リポジトリ内の設定だけ）。
 *
 * 守りたい事故:
 *   A. **書名の自由文字列が残る** — 版・表記が揺れて機械で追えなくなる（「主任技師」「主任技士」）。
 *   B. **class の取り違え** — 市販書籍を公的基準と同じ扱いにして逐語を公開する。
 *   C. **逐語の見落とし** — 文字起こしから写した文が、句読点や空白の違いで検出をすり抜ける。
 *   D. **必須化の緩み** — appliesTo に一致する記事の sources 欠落が、baseline に足されて増えていく。
 *   E. **公式の文章の偽赤** — 書籍も載せる過去問の設問・指針の名称・公的な定義を書籍の写しとして拾う（DN-0617）。
 *      差し引きが広すぎて、書籍の文の写しまで見逃すのも同じく事故。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  loadReferenceSources, buildSourceIndex, expandCatalogSources, resolveSourceRef, splitSourceRef,
  classRuleOf, globToRegExp, sourcesRequiringArticle, normalizeForCompare, buildTranscriptIndex,
  findVerbatimRuns, parseTranscriptHeader, loadStandardsCatalog, evaluateMissingSourcesRatchet,
  checkCitationEvidence, transcriptDirsForSource, VERBATIM_RULES, CITATION_RULES, VERBATIM_MIN_RUN,
  officialQuestionText, officialNamesOf, maskOfficialNames, excludeOfficialRuns, NAME_MASK,
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
  assert.deepEqual(req('content/site/concrete-chief-engineer/primary-materials/article.mdx'), ['jcia-past-exams'], '主任技士の問題文は市販書籍でなく公式過去問に結ぶ');
  assert.deepEqual(req('content/site/civil-construction-1/guide-age-career/article.mdx'), [], 'キャリア系ガイドは原本由来でない');
  assert.deepEqual(req('content/site/pe-comprehensive-management/keyword-x/article.mdx'), [], '総監キーワードは今回の射程外（DN-0178）');
  assert.deepEqual(req('content/site/standards-articles/kinki/common/chapters/1/index.md'), [], '章記事は生成物で SourceRef を持つ');
});

test('baseline ratchet: 新しい sources 欠落だけを FAIL 候補、解消分を返済候補に分ける', () => {
  const result = evaluateMissingSourcesRatchet(
    ['content/site/a/article.mdx', 'content/site/new/article.mdx'],
    ['content/site/a/article.mdx', 'content/site/repaid/article.mdx'],
  );
  assert.deepEqual(result.increased, ['content/site/new/article.mdx']);
  assert.deepEqual(result.repaid, ['content/site/repaid/article.mdx']);
});

test('citation: class ごとの出典粒度を ref 詳細・本文・台帳 URL から判定する', () => {
  const standard = { title: '土木工事共通仕様書', origin: { kind: 'catalog' } };
  assert.equal(checkCitationEvidence({ citation: 'page', source: standard, ref: 'std:kinki/common', articleText: '' }).ok, false);
  assert.equal(checkCitationEvidence({ citation: 'page', source: standard, ref: 'std:kinki/common#85-86', articleText: '' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'page', source: standard, ref: 'std:kinki/common', articleText: 'PDF page 85–86を参照。' }).ok, true);

  const web = { title: '公式ページ', origin: { kind: 'external', url: 'https://example.com/source' } };
  assert.equal(checkCitationEvidence({ citation: 'title-url', source: web, ref: 'web', articleText: '' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'title-url', source: { title: 'URLなし', origin: { kind: 'none' } }, ref: 'x', articleText: '' }).ok, false);

  const law = { title: '労働安全衛生規則', origin: { kind: 'external' } };
  assert.equal(checkCitationEvidence({ citation: 'section', source: law, ref: 'labor-safety-rules#第240条', articleText: '' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'section', source: law, ref: 'labor-safety-rules', articleText: '第240条を確認する。' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'section', source: law, ref: 'labor-safety-rules', articleText: '' }).ok, false);
  // 過去問の記事は見出しの「問題 No.5」が箇所指定（条文の引用を外しても箇所は残る）
  assert.equal(checkCitationEvidence({ citation: 'section', source: law, ref: 'labor-safety-rules', articleText: '## 問題 No.5\n' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'section', source: law, ref: 'labor-safety-rules', articleText: 'No.5 の問題' }).ok, false);
  assert.equal(checkCitationEvidence({ citation: 'title', source: law, ref: 'x', articleText: '' }).ok, true);
  assert.equal(checkCitationEvidence({ citation: 'name', source: law, ref: 'x', articleText: '' }).ok, true);
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

test('VERBATIM_MIN_RUN: 索引の粒度より短い閾値にしない（C・DN-0181 の校正結果を縛る）', () => {
  // buildTranscriptIndex の既定は seed=20 / stride=10。長さ seed+stride-1 未満の共通部分は
  // 種を丸ごと含まないことがあり、取りこぼす。閾値だけ下げると「緑なのに見逃す」状態になる。
  const probe = buildTranscriptIndex([{ key: 'x.md', source: 's', text: 'あ'.repeat(100) }]);
  assert.equal(probe.seed, 20);
  assert.equal(probe.stride, 10);
  assert.ok(
    VERBATIM_MIN_RUN >= probe.seed + probe.stride - 1,
    `minRun=${VERBATIM_MIN_RUN} は索引の保証長 ${probe.seed + probe.stride - 1} 未満。seed/stride も変えること`,
  );

  // 2026-09-08 実測: 実データの最長一致は 38 字。閾値を 38 以下にすると
  // JIS 規格名・数値付き技術要件が誤検知に変わる（206 件@35）。
  assert.ok(VERBATIM_MIN_RUN > 38, '実測の最長一致 38 字を下回る閾値は誤検知が出る');
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

test('findVerbatimRuns: 同じ20文字が先に短く現れても後方の長い一致を検出する', () => {
  const seed = '同じ語句が繰り返される場合でも逐語検査';
  const copied = seed + 'は候補位置をすべて比較し最長の一致を選ばなければならない';
  const index = buildTranscriptIndex([{ key: 'repeat.md', text: seed + '。別の説明。' + copied }], { seed: 20, stride: 1 });
  const hits = findVerbatimRuns('導入。' + copied + '。結び。', index, { minRun: 40 });
  assert.equal(hits.length, 1);
  assert.ok(hits[0].run >= normalizeForCompare(copied).length);
});

// ------------------------------------------------------------------ 公式の文章の差し引き（E）
// 書籍の文は公開リポジトリに置けないので、書籍側は「公式の文章＋作った説明文」で模す。

const OFFICIAL_QUESTION = '暑中コンクリートの施工に関する下記の(1)、(2)の項目について配慮すべき事項をそれぞれ解答欄に記述しなさい。(1) 暑中コンクリートの打込み (2) 暑中コンクリートの養生';
const BOOK_OWN = '練り上がりから打ち込みまでの時間を短く保つ段取りを現場ごとに組み立て、運搬経路と待機場所を事前に決めておくのが要点になる。';

function examPage(question, { trend = '', commentary = '' } = {}) {
  return ['## 出題傾向', '', trend, '', '## 平成29年度 問題3（暑中コンクリート）', '', question, '',
    '<details>', '<summary>解答・解説</summary>', '', commentary, '', '</details>', ''].join('\n');
}

test('officialQuestionText: 設問の見出しの節だけを取り、出題傾向と解答・解説は含めない（E）', () => {
  const page = examPage(OFFICIAL_QUESTION, { trend: '出題傾向の説明文。', commentary: '解説の文。' });
  const text = officialQuestionText(page);
  assert.ok(text.includes('配慮すべき事項'), '設問が入っていない');
  assert.ok(!text.includes('出題傾向の説明文'), '出題傾向の節は著者の文章');
  assert.ok(!text.includes('解説の文'), '<details> の中は解答・解説');
  for (const heading of ['## 問題 No.12', '## Ⅰ-1-3', '## III-2', '### 令和5年度 No.4', '### 〔設問1〕', '## 必須科目']) {
    assert.ok(officialQuestionText(heading + '\n\n設問の文。\n').includes('設問の文'), heading);
  }
  for (const heading of ['## 出典', '## 模範解答について', '## 論点の出題傾向', '## 参考資料']) {
    assert.equal(officialQuestionText(heading + '\n\n説明の文。\n').trim(), '', heading);
  }
});

test('excludeOfficialRuns: 過去問の設問との一致は除き、同じ記事の書籍の文は残す（E）', () => {
  const book = buildTranscriptIndex([{ key: 'book.md', source: 'book', text: OFFICIAL_QUESTION + BOOK_OWN }]);
  const official = buildTranscriptIndex([{ key: 'page', source: 'official-question', text: officialQuestionText(examPage(OFFICIAL_QUESTION)) }]);

  // 設問だけを引いた過去問ページ: 一致は全部が公式の文章
  const questionOnly = examPage(OFFICIAL_QUESTION, { commentary: '打込み温度を35℃以下に抑える。' });
  const hits = findVerbatimRuns(questionOnly, book);
  assert.ok(hits.length >= 1, '前提: 書籍との一致として拾われる');
  const r1 = excludeOfficialRuns(questionOnly, hits, official);
  assert.deepEqual(r1.kept, []);
  assert.equal(r1.excluded.length, hits.length);

  // 解説に書籍の文を写した過去問ページ: 設問に続けて写しても、写した区間は残る
  const copied = examPage(OFFICIAL_QUESTION + BOOK_OWN);
  const r2 = excludeOfficialRuns(copied, findVerbatimRuns(copied, book), official);
  assert.equal(r2.kept.length, 1, '書籍の文の写しを見逃した');
  assert.ok(r2.kept[0].run >= VERBATIM_MIN_RUN && r2.kept[0].run <= normalizeForCompare(BOOK_OWN).length + 1);
  assert.ok(normalizeForCompare(BOOK_OWN).startsWith(r2.kept[0].sample.slice(0, 20)), '見本は写した区間に差し替える');

  // 出題傾向の節に写した書籍の文は、設問の索引に入らないので残る
  const inTrend = examPage(OFFICIAL_QUESTION, { trend: BOOK_OWN });
  const pageIndex = buildTranscriptIndex([{ key: 'self', text: officialQuestionText(inTrend) }]);
  assert.equal(excludeOfficialRuns(inTrend, findVerbatimRuns(inTrend, book), pageIndex).kept.length, 1);

  // 公式の索引が無いときは何もしない
  assert.deepEqual(excludeOfficialRuns(copied, findVerbatimRuns(copied, book), null).excluded, []);
});

test('excludeOfficialRuns: 公的資料の officialTexts（エシカル消費の定義）との一致を除く（E）', () => {
  const source = CFG.sources.find((s) => s.id === 'caa-ethical-consumption-study');
  assert.ok(source?.officialTexts?.length, '台帳に公的資料の文が無い');
  assert.notEqual(CFG.classes[source.class].verbatim, 'forbidden');
  const definition = source.officialTexts[0].text;
  const article = '取りまとめ（平成29年4月）は、突き詰めれば、' + definition + 'と整理した。';
  const book = buildTranscriptIndex([{ key: 'book.md', text: 'エシカル消費は、' + definition + 'である。' }]);
  const hits = findVerbatimRuns(article, book);
  assert.ok(hits.length >= 1, '前提: 書籍との一致として拾われる');
  const official = buildTranscriptIndex([{ key: source.id, text: definition }]);
  assert.deepEqual(excludeOfficialRuns(article, hits, official).kept, []);
});

test('maskOfficialNames: 参考資料のリンクの題名と台帳の正式名称を比較から外す（E）', () => {
  const name = '事業主が職場における優越的な関係を背景とした言動に起因する問題に関して雇用管理上講ずべき措置等についての指針';
  const book = buildTranscriptIndex([{ key: 'book.md', text: '厚生労働省は' + name + 'を定めた。' }]);
  const article = '## 参考資料\n\n- [' + name + '](https://www.mhlw.go.jp/content/11900000/000584512.pdf)（厚生労働省告示）\n';
  assert.ok(findVerbatimRuns(article, book).length >= 1, '前提: 名称だけで 40 字を超える');
  const { text, masked } = maskOfficialNames(article, []);
  assert.equal(masked, 1);
  assert.deepEqual(findVerbatimRuns(text, book), []);
  // サイト内リンクの文字は本文なので外さない
  assert.equal(maskOfficialNames('[' + name + '](/docs/x)').masked, 0);

  const names = officialNamesOf(CFG);
  assert.ok(names.includes('危険性又は有害性等の調査等に関する指針'), '末尾の（厚生労働省）を落とす');
  assert.ok(names.every((n) => n.length >= 15), '短い名称は外さない（写しの検出を弱めるだけ）');
  const named = maskOfficialNames('事業者は危険性又は有害性等の調査等に関する指針に従う。', names);
  assert.equal(named.masked, 1);
  assert.ok(named.text.includes(NAME_MASK));
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

test('bookBundle: 新旧の文字起こしディレクトリを段階移行中だけ併用できる', () => {
  assert.deepEqual(transcriptDirsForSource(src('safety-management-all-7th')), [
    'content/sources/textbook/新しい時代の安全管理のすべて_第7版',
    'content/sources/books/safety-management-all-7th__新しい時代の安全管理のすべて_第7版/ocr',
  ]);
});
