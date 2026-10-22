#!/usr/bin/env node
/**
 * report-taxonomy-wiring.mjs — 分類と回遊の配線の点検（週次・月次レビューが読む。content-taxonomy.md §6-4）
 *
 * 入力: src/config/doc-meta-index.json（公開記事のメタ）・topics.json・tags.json・content-taxonomy.json・
 *       基準資料のカタログ、計測は GA4 の by-label（internal_nav_click のラベル別）と GSC のページ別の最新レポート（CI が供給）
 * 判定: 所属は src/lib/topic-membership.mjs、関連記事は src/lib/related-core.mjs、昇格は scripts/lib/content-taxonomy.mjs
 *       （サイトと検査と同じ関数。ここで判定を書き直さない）
 *
 *   npm run report-taxonomy-wiring              # 要対応・取りこぼし・回遊の質・計測を Markdown で出す
 *   npm run report-taxonomy-wiring -- --json    # JSON
 *   npm run report-taxonomy-wiring -- --check   # 完走だけ確かめる（quality-audit ci。成果物は書かない）
 *   npm run report-taxonomy-wiring -- --actions # 要対応があれば exit 1（週次レビューの点検 review-checks が読む）
 *
 * 要対応: テーマ所属なしの記事・記事型のタグだけの記事・行き先の無い主題タグ（どれも CI が止めるので通常 0）・昇格基準と status の食い違い・
 *        テーマの有料教材（products）のうち公開中でない商品（商品を止めたときにテーマのページから黙って消える）・
 *        一次資料で確かめてから 180 日を超えた計画・施策（台帳 config.policy-registry）・
 *        法令の節が出ない公開ハブ（そのテーマの記事が 2 本以上引く法令が無い。2026-10-22 に 3 テーマで気付くのが遅れた）。
 * 取りこぼし（判断の材料・exit に影響しない）: 関連記事のどこからも選ばれない記事、記事の多い noTopic のタグ（新テーマの候補）。
 * exit 0 = 完走 / 1 = 要対応（--actions のときだけ）/ 2 = 検査不成立（記事 0 件・設定が読めない・索引が MDX の公開記事と食い違う＝refresh-indexes をしていない）
 */
import { join } from 'node:path';
import { readJson } from './lib/json-io.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { latestReport } from './lib/metric-reports.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { buildAliasMap, countTopicDirections, topicEligibility, lacksSubjectTags } from './lib/content-taxonomy.mjs';
import { needsTopic, topicsOfDoc } from '../src/lib/topic-membership.mjs';
import { rankRelated } from '../src/lib/related-core.mjs';
import { lawTopicIndex, topicsOfLaw, lawsOfTopic } from '../src/lib/law-topic-core.mjs';
import { collectPublishedDocs, diffPublishedSlugs } from './lib/published-docs.mjs';

const NAME = 'report-taxonomy-wiring';
const args = parseCliArgs({ json: { type: 'boolean' }, check: { type: 'boolean' }, actions: { type: 'boolean' } });
const fail2 = (msg) => { console.error(`[${NAME}] 検査不成立: ${msg}`); process.exit(2); };

let index; let topics; let tags; let taxonomy; let categories; let catalog;
try {
  index = readJson(ROOT, 'src/config/doc-meta-index.json');
  topics = readJson(ROOT, 'src/config/topics.json');
  tags = readJson(ROOT, 'src/config/tags.json');
  taxonomy = readJson(ROOT, 'src/config/content-taxonomy.json');
  categories = readJson(ROOT, 'src/config/categories.json');
  catalog = readJson(ROOT, 'content/site/standards-library/catalog.json');
} catch (e) { fail2(`設定を読めない: ${e.message}（doc-meta-index は npm run build-indexes で作る）`); }

const aliasMap = buildAliasMap(tags);
const canon = (t) => aliasMap.toCanonical.get(t) ?? t;
const tagClass = (t) => aliasMap.classOf.get(canon(t)) ?? 'topical';
const categoryMap = new Map(categories.map((c) => [c.slug, c]));
const areaOf = (category) => categoryMap.get(category)?.area ?? 'exam';
const docs = Object.entries(index.docs ?? {})
  .map(([slug, m]) => ({ slug, ...m, tags: (m.tags ?? []).map(canon) }))
  .filter((d) => d.published !== false);
if (docs.length === 0) fail2('公開記事が 0 件');
// 索引は git 管理外の生成物で、pull しても作り直されない。古い索引で数えると偽の要対応を出すので、MDX の公開記事と食い違えば止める
const drift = diffPublishedSlugs(docs.map((d) => d.slug), collectPublishedDocs(ROOT).docs.map((d) => d.slug));
if (drift.missing.length || drift.extra.length) {
  fail2(`doc-meta-index が古い（MDX にあって索引に無い ${drift.missing.length} 本・索引にだけある ${drift.extra.length} 本。例: ${[...drift.missing, ...drift.extra].slice(0, 3).join(', ')}）。npm run refresh-indexes を先に回す`);
}

// ---- 所属 -------------------------------------------------------------------
const topicCache = new Map();
const topicsOf = (d) => { let t = topicCache.get(d.slug); if (!t) { t = topicsOfDoc(d, topics, canon); topicCache.set(d.slug, t); } return t; };
const needDocs = docs.filter((d) => needsTopic(d, { area: areaOf(d.category), classOf: tagClass }));
const topicless = needDocs.filter((d) => topicsOf(d).length === 0).map((d) => d.slug);
const subjectless = docs.filter((d) => lacksSubjectTags(d, tagClass)).map((d) => d.slug);
const coverageByCategory = {};
for (const d of needDocs) {
  const c = (coverageByCategory[d.category] ??= { need: 0, wired: 0 });
  c.need += 1; if (topicsOf(d).length) c.wired += 1;
}

// ---- テーマ（三方向・昇格） ----------------------------------------------------
const topicRows = topics.map((t) => {
  const dir = countTopicDirections(t, docs, categoryMap, catalog.documents ?? [], canon);
  const el = topicEligibility(dir, taxonomy.topicPromotion);
  return { slug: t.slug, label: t.label, facet: t.facet, status: t.status, exam: dir.exam, practice: dir.practice, standards: dir.standards, filled: el.filled, eligible: el.eligible };
});
// このテーマの有料教材（topics.json の products）。公開中でない商品はページから黙って消えるので要対応にする
const productList = readDataset(ROOT, 'config.products');
const liveNote = new Set((Array.isArray(productList) ? productList : productList.products ?? [])
  .filter((p) => p.channel === 'note' && p.catalog?.published && p.catalog?.noteUrl).map((p) => p.id));
for (const r of topicRows) {
  const ids = topics.find((t) => t.slug === r.slug)?.products ?? [];
  r.products = ids.length;
  r.deadProducts = ids.filter((id) => !liveNote.has(id));
}
const deadProducts = topicRows.flatMap((r) => r.deadProducts.map((id) => `${r.slug}:${id}`));
const promote = topicRows.filter((r) => r.status === 'incubating' && r.eligible).map((r) => r.slug);
const belowBar = topicRows.filter((r) => r.status === 'hub' && !r.eligible).map((r) => r.slug);

// ---- タグ ----------------------------------------------------------------------
const owned = new Set(topics.flatMap((t) => (t.tags ?? []).map(canon)));
const usage = new Map();
for (const d of docs) for (const t of d.tags) usage.set(t, (usage.get(t) ?? 0) + 1);
const unrouted = tags.filter((t) => (t.class ?? 'topical') === 'topical' && !owned.has(t.canonical ?? t.name) && !t.noTopic).map((t) => t.canonical ?? t.name);
// noTopic のタグに記事が溜まったら、新しいテーマ（か既存テーマへの追加）を検討する材料
const NOTOPIC_REVIEW_MIN = 10;
const noTopicHeavy = tags.filter((t) => t.noTopic && (usage.get(t.canonical ?? t.name) ?? 0) >= NOTOPIC_REVIEW_MIN)
  .map((t) => ({ tag: t.canonical ?? t.name, reason: t.noTopic, docs: usage.get(t.canonical ?? t.name) }))
  .sort((a, b) => b.docs - a.docs);

// ---- 回遊の質（記事末の関連記事を同じ算法で再現する。法令・テーマのカードで外す分は数えない近似） ------------------
const pool = docs.filter((d) => !d.tags.includes('模範論文') && !d.hideFromCategory);
const deps = { tagClass, topicsOf };
const inbound = new Map(pool.map((d) => [d.slug, 0]));
let shown = 0; let links = 0; let cross = 0;
for (const d of pool) {
  const related = rankRelated(d, pool, 6, new Set(), deps);
  if (related.length >= 2) { shown += 1; links += related.length; cross += related.filter((r) => r.category !== d.category).length; }
  for (const r of related) inbound.set(r.slug, (inbound.get(r.slug) ?? 0) + 1);
}
const isPast = (d) => ['primary', 'secondary', 'past-exam'].includes(d.group);
const unreached = pool.filter((d) => inbound.get(d.slug) === 0 && !isPast(d) && !d.tags.includes('career'));
const lawDocs = docs.filter((d) => (d.lawIds ?? []).length > 0 && d.category !== 'laws');
const lawCount = new Map();
for (const d of lawDocs) for (const id of d.lawIds) lawCount.set(id, (lawCount.get(id) ?? 0) + 1);
const lawWired = lawDocs.filter((d) => d.lawIds.some((id) => lawCount.get(id) >= 2)).length;
const lawTitles = readDataset(ROOT, 'config.egov-laws').laws ?? {};
// 法令ページ（/laws/・DN-0731）・法令の解説を兼ねる記事（explainsLaw）と、次に作る候補（content-taxonomy.json の lawPages：
// minDocs 本以上の記事が引くのに法令ページも解説記事も無く、作らない理由（skip）も無い法令）
const lawPageDocs = docs.filter((d) => d.category === 'laws');
const lawExplainers = docs.filter((d) => d.explainsLaw);
const coveredLaws = new Set([...lawPageDocs.flatMap((d) => [d.lawId, ...(d.lawFamily ?? [])]), ...lawExplainers.map((d) => d.explainsLaw)].filter(Boolean));
const lawPagePlan = taxonomy.lawPages ?? { minDocs: 5, skip: {} };
const lawPageCandidates = [...lawCount].filter(([id, n]) => n >= lawPagePlan.minDocs && !coveredLaws.has(id) && !lawPagePlan.skip?.[id]).sort((a, b) => b[1] - a[1])
  .map(([id, n]) => `${lawTitles[id]?.title ?? id}（${n}）`);
// 法令と分野・立場のテーマの多対多（サイトと同じ law-topic-core）。3 本以上が引く法令のうち、どのテーマとも結べないもの＝取りこぼし。
// 法令ページか解説記事がある法令は、そのページがテーマに属して法令名の行き先になるので数えない
const lawIndex = lawTopicIndex(pool.filter((d) => d.category !== 'laws'), topicsOf); // 法令ページ自身は数えない（サイトの law-wiring と同じ）
const majorLaws = [...lawCount].filter(([, n]) => n >= 3).map(([id]) => id);
const lawsWithoutTopic = majorLaws.filter((id) => !coveredLaws.has(id) && topicsOfLaw(lawIndex, id).length === 0).map((id) => lawTitles[id]?.title ?? id);
const topicsWithLaws = topics.filter((t) => lawsOfTopic(lawIndex, t.slug).length > 0).length;
// 公開ハブなのにテーマのページに法令の節が出ない（記事が本文で e-Gov の条を引いていない）。育成中のテーマは対象外
const hubsWithoutLaws = topics.filter((t) => t.status === 'hub' && lawsOfTopic(lawIndex, t.slug).length === 0).map((t) => t.slug);
// 計画・施策の台帳: 一次資料で確かめてから 180 日を超えたものは確かめ直す（壁時計に依存するので CI ではなく週次の点検で見る）
const POLICY_RECHECK_DAYS = 180;
const policies = readDataset(ROOT, 'config.policy-registry').policies ?? [];
const today = todayJst();
const stalePolicies = policies.filter((p) => (Date.parse(today) - Date.parse(p.checkedAt)) / 86_400_000 > POLICY_RECHECK_DAYS).map((p) => `${p.id}（${p.checkedAt}）`);
const topicsWithPolicies = topics.filter((t) => policies.some((p) => p.topics.includes(t.slug))).length;

// ---- 計測（CI 供給のレポート。無ければ「未取得」として出す・0 に変換しない） -----------------------------------------
const NAV_LABELS = ['related-articles', 'topic-hub:hub', 'topic-hub:article', 'law-siblings', 'law-topics', 'law-page', 'law-page:topics', 'law-page:articles', 'topic-laws', 'law-directory', 'policy-map', 'laws-index', 'topic-page', 'topic-related', 'category-topics'];
const ga4 = latestReport(ROOT, 'ga4.cta-clicks-by-label', { windowKind: 'days' });
const navClicks = ga4
  ? Object.fromEntries(NAV_LABELS.map((label) => [label, (ga4.data.rows ?? []).filter((r) => r.eventName === 'internal_nav_click' && r.label === label).reduce((a, r) => a + (r.eventCount ?? 0), 0)]))
  : null;
// テーマページの有料教材のクリック（MagazineInlineCard の label は「商品 id:topic-{slug}」）
const topicNoteClicks = ga4 ? (ga4.data.rows ?? []).filter((r) => r.eventName === 'note_cta_click' && /:topic-/.test(String(r.label))).reduce((a, r) => a + (r.eventCount ?? 0), 0) : null;
const topicsIndexClicks = ga4 ? (ga4.data.rows ?? []).filter((r) => r.eventName === 'internal_nav_click' && String(r.label).startsWith('topics-index:')).reduce((a, r) => a + (r.eventCount ?? 0), 0) : null;
const gsc = latestReport(ROOT, 'gsc.page');
const topicPages = gsc
  ? (gsc.data.rows ?? []).filter((r) => /\/topics(\/|$)/.test(String(r.page ?? r.keys?.[0] ?? '')))
    .map((r) => ({ page: String(r.page ?? r.keys?.[0]).replace(/^https?:\/\/[^/]+/, ''), clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 }))
    .sort((a, b) => b.impressions - a.impressions)
  : null;

const result = {
  docs: docs.length,
  coverage: { need: needDocs.length, topicless, byCategory: coverageByCategory },
  topics: topicRows,
  actions: { topicless: topicless.length, subjectless: subjectless.length, unrouted, promote, belowBar, deadProducts, stalePolicies, hubsWithoutLaws },
  laws: { pages: lawPageDocs.length, explainers: lawExplainers.length, candidates: lawPageCandidates, policies: policies.length, topicsWithPolicies },
  tags: { noTopicHeavy },
  circulation: {
    relatedShown: shown, pool: pool.length, crossCategoryShare: links ? cross / links : 0,
    unreached: unreached.map((d) => ({ slug: d.slug, category: d.category, group: d.group })),
    lawDocs: lawDocs.length, lawDocsWithSiblings: lawWired,
    majorLaws: majorLaws.length, lawsWithoutTopic, topicsWithLaws,
  },
  measurement: {
    ga4: ga4 ? { ref: ga4.ref, window: `${ga4.data.meta?.startDate}〜${ga4.data.meta?.endDate}`, navClicks, topicsIndexClicks, topicNoteClicks } : null,
    gsc: gsc ? { ref: gsc.ref, window: `${gsc.data.meta?.startDate ?? '?'}〜${gsc.data.meta?.endDate ?? '?'}`, topicPages } : null,
  },
};
const actionCount = topicless.length + subjectless.length + unrouted.length + promote.length + belowBar.length + deadProducts.length + stalePolicies.length + hubsWithoutLaws.length;

if (args.check) {
  console.log(`[${NAME}] OK: 公開記事 ${docs.length} 本・テーマ ${topics.length} 件を集計（所属が要る ${needDocs.length} 本・所属なし ${topicless.length} 本・要対応 ${actionCount} 件）`);
  process.exit(0);
}
if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pct = (n) => `${(n * 100).toFixed(0)}%`;
  const out = [];
  out.push(`## 分類と回遊の配線（公開記事 ${docs.length} 本・テーマ ${topics.length} 件）`, '');
  out.push(`### 要対応 ${actionCount} 件`);
  out.push(`- テーマ所属なし: ${topicless.length} 本${topicless.length ? `（${topicless.slice(0, 10).join(', ')}${topicless.length > 10 ? ' …' : ''}）` : ''}`);
  out.push(`- 記事型のタグだけの記事: ${subjectless.length} 本${subjectless.length ? `（${subjectless.slice(0, 10).join(', ')}）` : ''}`);
  out.push(`- 行き先の無い主題タグ: ${unrouted.length} 種${unrouted.length ? `（${unrouted.join(', ')}）` : ''}`);
  out.push(`- 昇格できる育成中のテーマ: ${promote.length ? promote.join(', ') : 'なし'}（status を hub にするか判断する）`);
  out.push(`- 昇格基準を下回る公開ハブ: ${belowBar.length ? belowBar.join(', ') : 'なし'}（記事を足すか判断する。即 noindex にしない）`);
  out.push(`- テーマの有料教材のうち公開中でない商品: ${deadProducts.length ? deadProducts.join(', ') : 'なし'}（topics.json の products から外すか差し替える）`);
  out.push(`- 一次資料で確かめてから ${POLICY_RECHECK_DAYS} 日を超えた計画・施策: ${stalePolicies.length ? stalePolicies.join(', ') : 'なし'}（計画・施策の台帳 config.policy-registry を一次資料で確かめ直し、checkedAt を更新する）`);
  out.push(`- 法令の節が出ない公開ハブ: ${hubsWithoutLaws.length ? hubsWithoutLaws.join(', ') : 'なし'}（そのテーマの記事 2 本以上の本文で、関係する法令の条を e-Gov へリンクして引く。条文は一次資料で照合する）`, '');
  out.push('### テーマ（軸・状態・三方向）', '', '| テーマ | 軸 | 状態 | 試験 | 実務 | 基準 | 有料教材 |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of topicRows) out.push(`| ${r.label} | ${taxonomy.topicFacets[r.facet]?.label ?? r.facet} | ${taxonomy.topicStatuses[r.status]?.label ?? r.status}${r.status === 'incubating' && r.eligible ? '（昇格可）' : ''} | ${r.exam} | ${r.practice} | ${r.standards} | ${r.products} |`);
  out.push('', '### 取りこぼしの候補（判断の材料）');
  out.push(`- 関連記事のどこからも選ばれない記事（過去問・キャリアを除く）: ${unreached.length} 本${unreached.length ? ` — ${unreached.slice(0, 15).map((d) => d.slug).join(', ')}${unreached.length > 15 ? ' …' : ''}` : ''}`);
  out.push(`- 記事の多い noTopic のタグ（${NOTOPIC_REVIEW_MIN} 本以上・新しいテーマの候補）: ${noTopicHeavy.length ? noTopicHeavy.map((t) => `${t.tag}（${t.reason}・${t.docs} 本）`).join('、') : 'なし'}`, '');
  out.push('### 回遊の質');
  out.push(`- 関連記事が出る記事: ${shown} / ${pool.length} 本・関連記事のうち他の資格・実務の割合 ${pct(result.circulation.crossCategoryShare)}`);
  out.push(`- 本文が法令を引く記事: ${lawDocs.length} 本（うち同じ法令を引く記事がほかにもある ${lawWired} 本）`);
  out.push(`- 法令ページ: ${lawPageDocs.length} 本・法令の解説を兼ねる記事 ${lawExplainers.length} 本・計画・施策の台帳 ${policies.length} 件（制度の地図があるテーマ ${topicsWithPolicies} / ${topics.length}）。次に作る候補（${lawPagePlan.minDocs} 本以上の記事が引くのに法令ページも解説記事も無く、作らない理由も無い）: ${lawPageCandidates.slice(0, 10).join('、') || 'なし'}`);
  out.push(`- 法令と分野・立場のテーマ: 3 本以上が引く法令 ${majorLaws.length} のうちテーマと結べない ${lawsWithoutTopic.length}${lawsWithoutTopic.length ? `（${lawsWithoutTopic.slice(0, 8).join(', ')}${lawsWithoutTopic.length > 8 ? ' …' : ''}）` : ''}・法令の節を持つテーマ ${topicsWithLaws} / ${topics.length}`, '');
  out.push('### 計測（internal_nav_click のラベル別・GSC のテーマページ）');
  if (navClicks) out.push(`- GA4 ${result.measurement.ga4.window}: ${NAV_LABELS.map((l) => `${l} ${navClicks[l]}`).join(' / ')} / topics-index:* ${topicsIndexClicks} / テーマページの有料教材（note_cta_click） ${topicNoteClicks}`);
  else out.push('- GA4: by-label のレポートが未取得（0 として扱わない）');
  if (topicPages) out.push(`- GSC ${result.measurement.gsc.window}: テーマページ ${topicPages.length} 件・クリック ${topicPages.reduce((a, r) => a + r.clicks, 0)}・表示 ${topicPages.reduce((a, r) => a + r.impressions, 0)}${topicPages.length ? `（上位: ${topicPages.slice(0, 5).map((r) => `${r.page} ${r.impressions}`).join('、')}）` : ''}`);
  else out.push('- GSC: ページ別のレポートが未取得（0 として扱わない）');
  console.log(out.join('\n'));
}
if (args.actions && actionCount > 0) process.exit(1);
