// アフィリ転職枠の「どの案件を出すか」を、キャンペーン境界（2026-08-31/09-01 JST）を跨いで固定する。
//
// なぜテストが要るか:
//   出し分けは Date.now() に依存し、**ビルドした時刻**で結果が変わる（SSG）。
//   9/1 を境に静かに切り替わるので、誤って壊しても「今は正しく見える」＝レビューで気づけない。
//   2026-08-04 に「9/1 以降の civil 記事面は建設JOBs 100%」（POST_CAMPAIGN_AB_ENABLED=false）へ
//   変更したが、それまで機械の検証は一切なく、実際 tsx の使い捨てスクリプトで 1 回確認しただけだった。
//   ここで固定しておかないと、A/B を戻す・境界日を動かす・resolver を触るのどれでも
//   収益の配線が無言で変わる。
//
// TS のロードは tests/note-membership-funnel.test.mjs と同じ esbuild transform 方式。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** affiliate-creatives.ts を ESM として評価して export を取り出す。 */
async function loadCreatives() {
  const ts = readFileSync(ROOT + 'src/config/affiliate-creatives.ts', 'utf8');
  const js = transformSync(ts, { loader: 'ts', format: 'esm' }).code;
  return import('data:text/javascript,' + encodeURIComponent(js));
}

/** Date.now を固定して fn を実行する（resolver は呼び出し時に評価する）。 */
function at(iso, fn) {
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return fn();
  } finally {
    Date.now = real;
  }
}

// A/B ハッシュの偶奇どちらにも落ちるように、実在 slug を複数並べる。
// 1 つでもハッシュ arm A 側に落ちれば「100% 建設JOBs」の検証が意味を持つ。
const CIVIL_SLUGS = [
  'civil-construction-1-guide-strategy',
  'civil-construction-1-secondary-experience-writing-guide',
  'civil-construction-2-secondary-r07',
  'civil-construction-1-textbook-leveling',
  'civil-construction-1-guide-quit-or-stay',
  'civil-construction-2-guide-salary',
  'pe-construction-guide-career',
  'civil-construction-1-primary-r07-b',
];

const DURING = '2026-08-15T00:00:00Z'; // キャンペーン中
const AFTER = '2026-09-05T00:00:00Z'; // キャンペーン終了後

test('キャンペーン中: civil の docs サイドバーと記事末カードは全 slug で BuildJob', async () => {
  const { resolveDocsCareerSidebarAd, resolveCareerArticleEndCard } = await loadCreatives();
  at(DURING, () => {
    const labels = new Set(
      CIVIL_SLUGS.map((s) => resolveDocsCareerSidebarAd('civil-construction-1', s).trackLabel),
    );
    const services = new Set(CIVIL_SLUGS.map((s) => resolveCareerArticleEndCard(s).service));
    assert.deepEqual([...labels], ['BuildJob-sidebar'], 'キャンペーン中は BuildJob 固定のはず');
    assert.deepEqual([...services], ['ビルドジョブ'], 'キャンペーン中の記事末カードは BuildJob のはず');
  });
});

test('9/1 以降: civil の記事面は全 slug で建設JOBs（50/50 A/B へ戻さない）', async () => {
  const { resolveDocsCareerSidebarAd, resolveCareerArticleEndCard } = await loadCreatives();
  at(AFTER, () => {
    const labels = new Set(
      CIVIL_SLUGS.map((s) => resolveDocsCareerSidebarAd('civil-construction-1', s).trackLabel),
    );
    const services = new Set(CIVIL_SLUGS.map((s) => resolveCareerArticleEndCard(s).service));
    // slug ハッシュで割れていれば 2 種類になる。1 種類であることが「A/B 停止」の実証。
    assert.deepEqual(
      [...labels],
      ['KensetsuJobs-sidebar'],
      'キャンペーン後は建設JOBs 100%（GKS 復帰や 50/50 A/B は 2026-08-04 の決定に反する）',
    );
    assert.deepEqual([...services], ['建設JOBs'], 'キャンペーン後の記事末カードは建設JOBs のはず');
  });
});

test('サイドバーと記事末カードは同一ページで必ず同じ案件になる', async () => {
  const { resolveDocsCareerSidebarAd, resolveCareerArticleEndCard } = await loadCreatives();
  // 面ごとに案件がズレると、1 ページに 2 社が混在し計測も読者体験も壊れる。
  const sameBrand = { 'BuildJob-sidebar': 'ビルドジョブ', 'KensetsuJobs-sidebar': '建設JOBs', 'GKS-sidebar': 'GKSキャリア' };
  for (const when of [DURING, AFTER]) {
    at(when, () => {
      for (const slug of CIVIL_SLUGS) {
        const label = resolveDocsCareerSidebarAd('civil-construction-1', slug).trackLabel;
        const service = resolveCareerArticleEndCard(slug).service;
        assert.equal(service, sameBrand[label], `${when} / ${slug}: サイドバー(${label}) と記事末(${service}) が食い違う`);
      }
    });
  }
});

test('総監は期間に関係なくハイクラス DX・コンサル（施工管理系を出さない）', async () => {
  const { resolveDocsCareerSidebarAd } = await loadCreatives();
  for (const when of [DURING, AFTER]) {
    at(when, () => {
      assert.equal(
        resolveDocsCareerSidebarAd('pe-comprehensive-management', 'pe-comprehensive-management-keyword-2026').trackLabel,
        'DXConsulting-sidebar',
        `${when}: 総監に施工管理系の案件が出ている（読者層ミスマッチ）`,
      );
    });
  }
});

test('カテゴリ hub は 2 枠で、9/1 以降も GKS の露出とピクセル源が残る', async () => {
  const { resolveCategoryCareerAds } = await loadCreatives();
  at(DURING, () => {
    const labels = resolveCategoryCareerAds('civil-construction-1').map((a) => a.trackLabel);
    assert.deepEqual(labels, ['KensetsuJobs-sidebar', 'BuildJob-sidebar']);
  });
  at(AFTER, () => {
    const labels = resolveCategoryCareerAds('civil-construction-1').map((a) => a.trackLabel);
    // GKS は「撤去」ではなく「記事面から外して hub に温存」が 2026-08-04 の決定。
    assert.deepEqual(
      labels,
      ['KensetsuJobs-sidebar', 'GKS-sidebar'],
      'GKS が hub からも消えている＝温存の決定に反する（撤去するなら裁定ログを更新すること）',
    );
  });
});

test('各 creative は計測ピクセルと寸法を持つ（外すと成果が計測されない / CLS）', async () => {
  const { resolveCategoryCareerAds, resolveDocsCareerSidebarAd } = await loadCreatives();
  at(DURING, () => {
    const creatives = [
      ...resolveCategoryCareerAds('civil-construction-1').map((a) => a.creative),
      resolveDocsCareerSidebarAd('pe-comprehensive-management', 'x').creative,
    ];
    for (const c of creatives) {
      assert.match(c.pixelSrc, /^https:\/\/www\d+\.a8\.net\/0\.gif\?a8mat=/, `pixelSrc が A8 の計測ピクセルでない: ${c.alt}`);
      assert.match(c.href, /^https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=/, `href が A8 のリンクでない: ${c.alt}`);
      assert.ok(c.width > 0 && c.height > 0, `width/height が無い（CLS 防止に必須）: ${c.alt}`);
      assert.ok(c.alt && c.alt.length > 0, 'alt が空');
    }
  });
});
