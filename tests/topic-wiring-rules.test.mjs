/**
 * 分類の軸と記事末の回遊（content-taxonomy.md §6）を固定する。
 *
 * 守りたい事故:
 *   - 主題タグを足しても、どのテーマにも属さず回遊の経路に乗らない（2026-10 までテーマ外の主題タグが 27 種あった）
 *   - 用語・章・実務の記事がどのテーマにも属さず、記事末からテーマへ行けない
 *   - 関連記事が同じ資格だけになる（学習の型・資格のタグを技術テーマと同じ重みで数えていた。他の資格の割合 2%）
 *   - 記事末の配線（テーマのカード・同じ法令の記事・計測のラベル）が片方だけ外れる
 *   - 育成中のテーマが検索に出る
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { topicsOfDoc, needsTopic } from '../src/lib/topic-membership.mjs';
import { relatedScore, fallbackScore, rankRelated } from '../src/lib/related-core.mjs';
import { topicEligibility, lacksSubjectTags } from '../scripts/lib/content-taxonomy.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const TOPICS = JSON.parse(read('src/config/topics.json'));
const TAGS = JSON.parse(read('src/config/tags.json'));
const TAXONOMY = JSON.parse(read('src/config/content-taxonomy.json'));

const FIX_TOPICS = [
  { slug: 'concrete', tags: ['コンクリート'], categories: ['concrete-engineer'] },
  { slug: 'roads', tags: ['道路'] },
  { slug: 'laws', tags: ['関係法規'] },
];

test('topicsOfDoc: 明示 → カテゴリ → タグの順・重複なし・非公開と未知の明示は除く', () => {
  const doc = { category: 'concrete-engineer', tags: ['道路', 'コンクリート'], topics: ['laws', 'nope', 'roads'] };
  assert.deepEqual(topicsOfDoc(doc, FIX_TOPICS), ['laws', 'roads', 'concrete']);
  assert.deepEqual(topicsOfDoc({ ...doc, published: false }, FIX_TOPICS), []);
  // タグ由来は記事に書いた順（topics.json の並びではない）
  assert.deepEqual(topicsOfDoc({ category: 'x', tags: ['関係法規', '道路'] }, FIX_TOPICS), ['laws', 'roads']);
  // 綴りの正規化はテーマ側のタグにも通す
  const canon = (t) => (t === 'road' ? '道路' : t);
  assert.deepEqual(topicsOfDoc({ category: 'x', tags: ['道路'] }, [{ slug: 'roads', tags: ['road'] }], canon), ['roads']);
});

test('needsTopic: 用語・章・実務・主題タグ付きガイドは要る／過去問・キャリア・手続きのガイド・基準は要らない', () => {
  const classOf = (t) => ({ 試験対策: 'learning', '技術士（第二次試験）': 'qualification', career: 'flag' }[t] ?? 'topical');
  const ctx = (area = 'exam') => ({ area, classOf });
  assert.equal(needsTopic({ group: 'keyword', tags: ['試験対策'] }, ctx()), true);
  assert.equal(needsTopic({ group: 'textbook', tags: [] }, ctx()), true);
  assert.equal(needsTopic({ group: 'guide', tags: [] }, ctx('practice')), true);
  assert.equal(needsTopic({ group: 'guide', tags: ['試験対策', '道路'] }, ctx()), true);
  assert.equal(needsTopic({ group: 'guide', tags: ['試験対策', '技術士（第二次試験）'] }, ctx()), false);
  assert.equal(needsTopic({ group: 'guide', tags: ['career', '道路'] }, ctx()), false);
  assert.equal(needsTopic({ group: 'primary', tags: ['道路'] }, ctx()), false);
  assert.equal(needsTopic({ group: 'keyword', tags: ['模範論文'] }, ctx()), false);
  assert.equal(needsTopic({ group: 'guide', tags: ['道路'] }, ctx('standards')), false);
  assert.equal(needsTopic({ group: 'keyword', tags: [], published: false }, ctx()), false);
});

const CLASS = { 試験対策: 'learning', 令和7年度: 'qualification', 建設部門: 'qualification', guide: 'structural' };
const deps = { tagClass: (t) => CLASS[t] ?? 'topical', topicsOf: (d) => topicsOfDoc(d, FIX_TOPICS) };

test('relatedScore: 学習の型・資格だけの共有は関連にしない／テーマの共有で拾う／同じ資格に小さく加点', () => {
  const cur = { slug: 'a', category: 'c1', tags: ['試験対策', '令和7年度', 'guide'] };
  assert.equal(relatedScore(cur, { slug: 'b', category: 'c1', tags: ['試験対策', '令和7年度'] }, deps), 0);
  assert.equal(fallbackScore(cur, { slug: 'b', category: 'c1', tags: ['試験対策', '令和7年度'] }, deps), 1 + 3 + 2);
  const road = { slug: 'r', category: 'c1', tags: ['道路', '建設部門'] };
  // 共有タグ 道路（10）＋ テーマ roads（6）＋ 同じ資格（2）。資格タグ（建設部門）は関連度に数えない
  assert.equal(relatedScore(road, { slug: 's', category: 'c1', tags: ['道路', '建設部門'] }, deps), 18);
  // 資格タグの有無で同点が崩れない（付け忘れた記事が毎回負けない）
  assert.equal(relatedScore(road, { slug: 'u', category: 'c1', tags: ['道路'] }, deps), 18);
  // 別の綴りでも同じテーマなら拾う（明示所属）
  assert.equal(relatedScore(road, { slug: 't', category: 'c2', tags: [], topics: ['roads'] }, deps), 6);
});

test('rankRelated: 同じ資格は 6 件中 4 件まで・exclude を外す・足りなければ同じ資格と補いで埋める', () => {
  const cur = { slug: 'cur', category: 'c1', tags: ['道路'] };
  const same = Array.from({ length: 6 }, (_, i) => ({ slug: `s${i}`, category: 'c1', tags: ['道路'], dateModified: `2026-10-0${i + 1}` }));
  const other = [{ slug: 'o1', category: 'c2', tags: ['道路'] }, { slug: 'o2', category: 'c3', tags: ['道路'] }];
  const got = rankRelated(cur, [...same, ...other], 6, new Set(['s5']), deps);
  assert.equal(got.length, 6);
  assert.equal(got.filter((d) => d.category === 'c1').length, 4);
  assert.ok(!got.some((d) => d.slug === 's5'), 'exclude した記事が残っている');
  // 他の資格の候補が無ければ同じ資格で埋める
  assert.equal(rankRelated(cur, same, 6, new Set(), deps).length, 6);
  // 技術テーマの共有が無い記事は、資格・学習の型の共有で補う
  const guide = { slug: 'g', category: 'c1', tags: ['試験対策'] };
  assert.deepEqual(rankRelated(guide, [{ slug: 'h', category: 'c1', tags: ['試験対策'] }], 6, new Set(), deps).map((d) => d.slug), ['h']);
});

test('rankRelated: 同点は記事ごとに散らす（どの記事からも同じ記事が選ばれて、他の記事が一度も選ばれない状態にしない）', () => {
  // 2026-10-21: 同点を更新日の新しい順で並べていたため、1,100 本のうち 705 本がどの記事の関連記事にも選ばれなかった
  const candidates = Array.from({ length: 12 }, (_, i) => ({ slug: `c${i}`, category: 'c2', tags: ['道路'], dateModified: `2026-10-${String(i + 1).padStart(2, '0')}` }));
  const firstPicks = new Set();
  for (let i = 0; i < 12; i++) {
    const cur = { slug: `cur${i}`, category: 'c1', tags: ['道路'] };
    firstPicks.add(rankRelated(cur, candidates, 1, new Set(), deps)[0].slug);
  }
  assert.ok(firstPicks.size >= 4, `12 本の記事の 1 位が ${firstPicks.size} 種類しかない（同点が 1 つの記事に集中している）`);
  // 同じ組なら毎回同じ並び（ビルドのたびに関連記事が入れ替わらない）
  const cur = { slug: 'cur0', category: 'c1', tags: ['道路'] };
  assert.deepEqual(rankRelated(cur, candidates, 6, new Set(), deps), rankRelated(cur, [...candidates].reverse(), 6, new Set(), deps));
});

test('lacksSubjectTags: 記事型のタグだけのガイドを拾い、過去問・キャリアは対象外', () => {
  const classOf = (t) => ({ guide: 'structural', 'past-questions': 'structural', career: 'flag', 試験対策: 'learning' }[t] ?? 'topical');
  assert.equal(lacksSubjectTags({ group: 'guide', tags: ['guide'] }, classOf), true);
  assert.equal(lacksSubjectTags({ group: 'guide', tags: ['guide', '試験対策'] }, classOf), false);
  assert.equal(lacksSubjectTags({ group: 'guide', tags: ['guide', 'career'] }, classOf), false);
  assert.equal(lacksSubjectTags({ group: 'primary', tags: ['past-questions'] }, classOf), false);
  assert.equal(lacksSubjectTags({ group: 'guide', tags: ['guide'], published: false }, classOf), false);
});

test('topicEligibility: 埋まった方向が 2 つ以上で公開ハブにできる', () => {
  const p = TAXONOMY.topicPromotion;
  assert.deepEqual(topicEligibility({ exam: 5, practice: 1, standards: 0 }, p), { filled: ['exam', 'practice'], eligible: true });
  assert.deepEqual(topicEligibility({ exam: 11, practice: 0, standards: 0 }, p), { filled: ['exam'], eligible: false });
});

test('実データ: テーマは軸と状態を持ち、主題タグはどれかのテーマに属すか noTopic の理由を持つ', () => {
  assert.ok(TOPICS.length >= 20, `テーマが ${TOPICS.length} 件しかない（検査対象の欠け）`);
  for (const t of TOPICS) {
    assert.ok(TAXONOMY.topicFacets[t.facet], `${t.slug}: facet「${t.facet}」が語彙外`);
    assert.ok(TAXONOMY.topicStatuses[t.status], `${t.slug}: status「${t.status}」が語彙外`);
  }
  for (const facet of Object.keys(TAXONOMY.topicFacets)) assert.ok(TOPICS.some((t) => t.facet === facet), `軸 ${facet} にテーマが 0 件`);
  const owned = new Set(TOPICS.flatMap((t) => t.tags));
  const topical = TAGS.filter((t) => (t.class ?? 'topical') === 'topical');
  assert.ok(topical.length >= 50, `主題タグが ${topical.length} 種しか読めない`);
  for (const t of topical) {
    const name = t.canonical ?? t.name;
    assert.ok(owned.has(name) || TAXONOMY.noTopicReasons[t.noTopic], `主題タグ「${name}」がどのテーマにも属さず noTopic も無い`);
  }
});

test('記事末の配線: 法令 → テーマ → 関連記事の順に、先に出した記事を後ろから外す', () => {
  const footer = read('src/components/ui/ArticleFooter/ArticleFooter.tsx');
  assert.ok(footer.includes('<TopicHubLinks links={topicLinks} />'), '記事末に「この記事のテーマ」が無い');
  assert.ok(footer.includes('<ArticleLaws laws={laws} siblings={lawSiblings} />'), '根拠法令のカードに同じ法令の記事が渡っていない');
  assert.ok(footer.includes('exclude={shownSlugs}'), '関連記事が先のカードの記事を外していない');
  assert.ok(footer.indexOf('<ArticleLaws') < footer.indexOf('<TopicHubLinks') && footer.indexOf('<TopicHubLinks') < footer.indexOf('<RelatedArticles'),
    '記事末の並び（法令 → テーマ → 関連記事）が崩れている');
});

test('計測: 新しい回遊の面は internal_nav_click のラベルで分かれる（送る側と取る側）', () => {
  assert.ok(read('src/components/ui/TopicHubLinks/TopicHubLinks.tsx').includes('trackNav="topic-hub"'), 'テーマのカードに計測ラベルが無い');
  assert.ok(read('src/components/ui/ArticleLaws/ArticleLaws.tsx').includes('data-cta-label="law-siblings"'), '同じ法令の記事に計測ラベルが無い');
  const page = read('src/app/topics/[slug]/page.tsx');
  assert.ok(page.includes('data-cta-label="topic-related"') && page.includes('data-cta-label="topic-page"'), 'テーマページの回遊に計測ラベルが無い');
  assert.ok(read('src/components/category/CategoryTopics.tsx').includes('data-cta-label="category-topics"'), '資格のハブの「テーマから探す」に計測ラベルが無い');
  assert.ok(read('src/components/category/CategoryPage.tsx').includes('<CategoryTopics'), '資格のハブからテーマへのリンクが外れている');
  assert.ok(read('.claude/scripts/fetch-ga4-cta-clicks.mjs').includes('"internal_nav_click"'), 'fetch-ga4-cta-clicks が internal_nav_click を取っていない');
});

test('テーマの有料教材: id は公開中の note の商品を指し、ページは MagazineCard（inline・placement topic-page）で出す', () => {
  const products = JSON.parse(read('config/products.json')).products;
  const live = new Set(products.filter((p) => p.channel === 'note' && p.catalog?.published && p.catalog?.noteUrl).map((p) => p.id));
  const listed = TOPICS.flatMap((t) => t.products ?? []);
  assert.ok(listed.length >= 20, `テーマの有料教材が ${listed.length} 件しか無い（配線の欠けを疑う）`);
  for (const t of TOPICS) for (const id of t.products ?? []) assert.ok(live.has(id), `${t.slug}: products「${id}」が公開中の note の商品に無い`);
  const page = read('src/app/topics/[slug]/page.tsx');
  assert.ok(page.includes('variant="inline"') && page.includes('placement="topic-page"') && page.includes('utmContent={`topic-${topic.slug}`}'), 'テーマページの有料教材の枠が外れている');
});

test('立場の軸: 自治体の土木職は実務のシリーズと試験側の土木公務員向けの記事を束ねる', () => {
  const t = TOPICS.find((x) => x.slug === 'municipal-civil-engineers');
  assert.ok(t && t.facet === 'audience' && t.tags.includes('地方公共団体'), '自治体の土木職のテーマが立場の軸に無い');
  const docs = Object.entries(JSON.parse(read('src/config/doc-meta-index.json')).docs).filter(([, m]) => (m.tags ?? []).includes('地方公共団体'));
  const practice = docs.filter(([, m]) => m.category === 'civil-practice').length;
  const exam = docs.filter(([, m]) => m.category !== 'civil-practice').length;
  assert.ok(practice >= 40 && exam >= 5, `地方公共団体のタグ: 実務 ${practice} 本・試験側 ${exam} 本（実務と試験の両方を束ねていない）`);
});

test('育成中のテーマは noindex（サイトマップは out/ の robots を見て外す）', () => {
  const page = read('src/app/topics/[slug]/page.tsx');
  assert.ok(page.includes('noindex: !isTopicIndexable(topic)'), 'テーマページが status を noindex に結んでいない');
  assert.ok(read('scripts/generate-sitemap.mjs').includes('noindex'), 'サイトマップが noindex のページを外していない');
});

test('記事メタの索引は本文の e-Gov へのリンクから法令を持つ', () => {
  const docs = Object.values(JSON.parse(read('src/config/doc-meta-index.json')).docs);
  const withLaws = docs.filter((m) => Array.isArray(m.lawIds) && m.lawIds.length > 0);
  assert.ok(withLaws.length >= 200, `法令を持つ記事が ${withLaws.length} 本しかない（build-doc-meta-index の配線切れを疑う）`);
});
