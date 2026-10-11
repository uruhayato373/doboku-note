import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SINGLE_ARTICLE_TITLE_RULES,
  canonicalizeProductId,
  resolveMagazineId,
  resolveKnownSaleEntry,
  resolveSaleEntry,
  resolveSingleArticleId,
  reconcileTotal,
} from '../scripts/lib/sales-normalize.mjs';
import { catalogMagazines } from '../scripts/lib/sales-mapping.mjs';
import { classifySale, loadLineupConfig } from '../scripts/lib/product-lineup.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('既知の表記ゆれは同一 id に正規化される（DN-0018 の実例）', () => {
  assert.equal(canonicalizeProductId('bk-i-r08-yosou-4'), 'bk-i-r8-yosou-04-cn-gx');
  assert.equal(canonicalizeProductId('article:bk-i-r08-yosou-4'), 'article:bk-i-r8-yosou-04-cn-gx');
});

test('canonicalizeProductId は article: 接頭辞の有無を保つ', () => {
  assert.equal(canonicalizeProductId('essay-complete-pack'), 'essay-complete-pack');
  assert.equal(canonicalizeProductId('article:tankan-calc-6patterns'), 'article:tankan-calc-6patterns');
});

test('canonicalizeProductId は未知の id をそのまま返す', () => {
  assert.equal(canonicalizeProductId('brand-new-magazine-id'), 'brand-new-magazine-id');
});

test('canonicalizeProductId は空/未定義を素通しする', () => {
  assert.equal(canonicalizeProductId(''), '');
  assert.equal(canonicalizeProductId(undefined), undefined);
});

const MAGAZINES = [
  { id: 'essay-complete-pack', title: '総監記述式 完全パック', shortTitle: '完全パック' },
  { id: 'bk-i-required-essay-magazine', title: '技術士 建設部門 2次｜必須科目I 模範解答集', shortTitle: '必須科目I 模範解答集' },
];

test('resolveMagazineId はタイトル完全一致を最優先で解決する', () => {
  assert.equal(resolveMagazineId('総監記述式 完全パック', MAGAZINES), 'essay-complete-pack');
});

test('resolveMagazineId は shortTitle 一致でも解決する', () => {
  assert.equal(resolveMagazineId('完全パック', MAGAZINES), 'essay-complete-pack');
});

test('resolveMagazineId は部分一致（商品名がタイトルを含む）でも解決する', () => {
  assert.equal(
    resolveMagazineId('技術士 建設部門 2次｜必須科目I 模範解答集（購入）', MAGAZINES),
    'bk-i-required-essay-magazine'
  );
});

test('resolveMagazineId は noteTitle（販売履歴に出る note 上のマガジン名）でも解決する。title・shortTitle と一致しなくてよい', () => {
  // 2026-10-11 の実例: 販売履歴の商品名は noteTitle で出る。shortTitle は「土質基礎 合格パック」で一致しない
  const packs = [
    {
      id: 'pe-construction-geotechnical-pack',
      noteTitle: '建設部門2次｜土質基礎まるごと合格パック',
      title: '技術士 建設部門 2次｜土質基礎 まるごと合格パック（必須科目I＋土質及び基礎 選択科目）',
      shortTitle: '建設部門2次｜土質基礎 合格パック',
    },
    ...MAGAZINES,
  ];
  assert.equal(resolveMagazineId('建設部門2次｜土質基礎まるごと合格パック', packs), 'pe-construction-geotechnical-pack');
  assert.equal(resolveMagazineId('建設部門2次｜土質基礎まるごと合格パック', MAGAZINES), null, 'noteTitle を渡さなければ解決できない（前提の確認）');
  // 完全一致は部分一致より先: noteTitle が別マガジンの shortTitle を含んでも、完全一致した側に解決する
  const nested = [
    { id: 'short', title: '長い説明的な題名 A', shortTitle: '土質基礎' },
    { id: 'exact', title: '長い説明的な題名 B', noteTitle: '建設部門2次｜土質基礎まるごと合格パック' },
  ];
  assert.equal(resolveMagazineId('建設部門2次｜土質基礎まるごと合格パック', nested), 'exact');
});

test('resolveSaleEntry は noteTitle 一致のマガジンを magazine 型で返す（取り直しで unknown に戻らない）', () => {
  const packs = [{ id: 'pe-construction-geotechnical-pack', noteTitle: '建設部門2次｜土質基礎まるごと合格パック', title: '技術士 建設部門 2次｜土質基礎 まるごと合格パック', shortTitle: '土質基礎 合格パック' }];
  assert.deepEqual(resolveSaleEntry({ title: '建設部門2次｜土質基礎まるごと合格パック', date: '2026-10-08' }, packs, 0), {
    type: 'magazine', productId: 'pe-construction-geotechnical-pack', resolved: true,
  });
});

test('実データ: カタログの noteTitle はすべて自分の id に解決する（取り直しで別のマガジンや unknown にならない）', () => {
  const catalog = catalogMagazines(readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8'));
  const withNoteTitle = catalog.filter((m) => m.noteTitle);
  assert.ok(withNoteTitle.length >= 50, `noteTitle を持つ商品が ${withNoteTitle.length} 件しかない（カタログを読めていない）`);
  for (const m of withNoteTitle) {
    assert.equal(resolveMagazineId(m.noteTitle, catalog), canonicalizeProductId(m.id), `${m.id}: noteTitle「${m.noteTitle}」が自分の id に解決しない`);
  }
  // 10/8 の売上（土質基礎まるごと合格パック）が、検算つきの取り直しと同じ経路（resolveSaleEntry）で確定する
  assert.deepEqual(resolveSaleEntry({ title: '建設部門2次｜土質基礎まるごと合格パック', date: '2026-10-08' }, catalog, 0), {
    type: 'magazine', productId: 'pe-construction-geotechnical-pack', resolved: true,
  });
});

test('カタログに無い単品記事は題名の手当表で解決する。note 側で題名が変わっても（接尾辞の追加など）同じ id になる', () => {
  // 総監 R8 予想の単品。旧ログの題名「R8予想問題 災害復旧 × 複合災害対応」と現行「令和8年度 総監記述式 R8予想問題｜…」
  assert.equal(resolveSingleArticleId('R8予想問題 災害復旧 × 複合災害対応'), 'article:r8-disaster-recovery-compound');
  assert.equal(resolveSingleArticleId('令和8年度 総監記述式 R8予想問題｜災害復旧 × 複合災害対応'), 'article:r8-disaster-recovery-compound');
  // 道路の R8 予想（II-2-1・II-2 予想②③・III 予想①③）。旧題名と「（予想問題＋フル模範解答）」付きの現行題名
  const road = (subject) => `技術士 建設部門｜道路 R8予想 選択科目${subject}`;
  const cases = [
    [road('II-2-1 新モビリティ対応道路空間再配分計画'), 'article:bk-01-road-r8-yosou-ii2-1'],
    [road('II-2-1 新モビリティ対応の道路空間再配分計画（予想問題＋フル模範解答）'), 'article:bk-01-road-r8-yosou-ii2-1'],
    [road('II-2 予想② インフラDX道路維持管理計画'), 'article:bk-01-road-r8-yosou-ii2-2'],
    [road('II-2 予想② インフラDXを活用した道路維持管理計画（予想問題＋フル模範解答）'), 'article:bk-01-road-r8-yosou-ii2-2'],
    [road('II-2 予想③ 道路啓開・災害復旧の施工計画（予想問題＋フル模範解答）'), 'article:bk-01-road-r8-yosou-ii2-3'],
    [road('III 予想① 道路の脱炭素化（予想問題＋フル模範解答）'), 'article:bk-01-road-r8-yosou-iii-1'],
    [road('III 予想③ 道路ネットワークの事前防災・強靱化（予想問題＋フル模範解答）'), 'article:bk-01-road-r8-yosou-iii-3'],
  ];
  for (const [title, id] of cases) assert.equal(resolveSingleArticleId(title), id, title);
});

test('手当表は別の商品に当てない: 似た題名（II-1・別科目・ペルソナ別論文）と空は null、規則同士は重ならない', () => {
  assert.equal(resolveSingleArticleId('技術士 建設部門｜道路 R8予想 選択科目II-1 模範解答（全4予想設問）'), null);
  assert.equal(resolveSingleArticleId('技術士 建設部門｜鋼構造及びコンクリート R8予想 選択科目II-2 模範解答'), null);
  assert.equal(resolveSingleArticleId('令和8年度 総監記述式 模範論文｜自治体 道路担当版（災害復旧・複合災害対応／R8予想④）'), null);
  assert.equal(resolveSingleArticleId(''), null);
  assert.equal(resolveSingleArticleId(undefined), null);
  // 各規則の見本題名が、その規則の id にだけ当たる（規則の語が他の規則の題名にも入って取り違えない）
  const samples = {
    'article:r8-disaster-recovery-compound': '令和8年度 総監記述式 R8予想問題｜災害復旧 × 複合災害対応',
    'article:bk-01-road-r8-yosou-ii2-1': '技術士 建設部門｜道路 R8予想 選択科目II-2-1 新モビリティ対応',
    'article:bk-01-road-r8-yosou-ii2-2': '技術士 建設部門｜道路 R8予想 選択科目II-2 予想② インフラDX',
    'article:bk-01-road-r8-yosou-ii2-3': '技術士 建設部門｜道路 R8予想 選択科目II-2 予想③ 道路啓開',
    'article:bk-01-road-r8-yosou-iii-1': '技術士 建設部門｜道路 R8予想 選択科目III 予想① 道路の脱炭素化',
    'article:bk-01-road-r8-yosou-iii-3': '技術士 建設部門｜道路 R8予想 選択科目III 予想③ 道路ネットワーク',
  };
  assert.deepEqual(Object.keys(samples).sort(), SINGLE_ARTICLE_TITLE_RULES.map((r) => r.productId).sort(), '見本題名の無い規則がある（規則を足したら見本も足す）');
  for (const [id, title] of Object.entries(samples)) {
    const hits = SINGLE_ARTICLE_TITLE_RULES.filter((r) => r.all.every((w) => title.normalize('NFKC').includes(w.normalize('NFKC'))));
    assert.deepEqual(hits.map((r) => r.productId), [id], title);
  }
});

test('resolveSaleEntry は手当表の単品を article 型で確定する（unknown に保留しない）', () => {
  const r = resolveSaleEntry({ title: '令和8年度 総監記述式 R8予想問題｜災害復旧 × 複合災害対応', date: '2026-05-30' }, MAGAZINES, 0);
  assert.deepEqual(r, { type: 'article', productId: 'article:r8-disaster-recovery-compound', resolved: true });
});

test('手当表の id はすべて商品ラインナップ（product-lineup.json）で資格のマスに分類される', () => {
  const config = loadLineupConfig(ROOT);
  for (const rule of SINGLE_ARTICLE_TITLE_RULES) {
    assert.ok(classifySale(config, rule.productId), `${rule.productId} が資格に分類できない（product-lineup.json の salesRules か rules.note に足す）`);
  }
  // 確定した商品の分類先（売上の資格別集計が読む）
  assert.deepEqual(classifySale(config, 'article:r8-disaster-recovery-compound'), ['pe-comprehensive-management:written']);
  assert.deepEqual(classifySale(config, 'article:bk-01-road-r8-yosou-ii2-3'), ['pe-construction:written']);
  assert.deepEqual(classifySale(config, 'pe-construction-geotechnical-pack'), ['pe-construction:written']);
});

test('resolveMagazineId は一致しなければ null（誤推定より保留を優先）', () => {
  assert.equal(resolveMagazineId('まったく無関係の商品名', MAGAZINES), null);
});

test('resolveSaleEntry はマガジン一致を magazine 型で返す', () => {
  const r = resolveSaleEntry({ title: '完全パック', date: '2026-06-17' }, MAGAZINES, 0);
  assert.deepEqual(r, { type: 'magazine', productId: 'essay-complete-pack', resolved: true });
});

test('resolveSaleEntry は未一致を article:unknown-* へ保留する（人手確認用）', () => {
  const r = resolveSaleEntry({ title: '技術士 建設部門｜道路 R8予想 選択科目II-1', date: '2026-06-17' }, MAGAZINES, 2);
  assert.equal(r.resolved, false);
  assert.equal(r.productId, 'article:unknown-20260617-2');
});

test('既存ログで同じ表示名に確定済みの単一 id があれば再利用する', () => {
  const sales = [
    { title: '1級土木 完成答案', productId: 'article:civil-1-keiken-pack-24', type: 'article' },
    { title: '別商品', productId: 'article:other', type: 'article' },
  ];
  assert.deepEqual(resolveKnownSaleEntry('1級土木 完成答案', sales), {
    type: 'article', productId: 'article:civil-1-keiken-pack-24', resolved: true,
  });
});

test('同名に複数 id がある場合と unknown だけの場合は再利用しない', () => {
  assert.equal(resolveKnownSaleEntry('同名', [
    { title: '同名', productId: 'article:a', type: 'article' },
    { title: '同名', productId: 'article:b', type: 'article' },
  ]), null);
  assert.equal(resolveKnownSaleEntry('未解決', [
    { title: '未解決', productId: 'article:unknown-20260801-0', type: 'article' },
  ]), null);
});

test('reconcileTotal は明細合計と月次表示額が一致すれば ok', () => {
  const r = reconcileTotal([{ price: 500 }, { price: 780 }], 1280);
  assert.equal(r.ok, true);
  assert.equal(r.computed, 1280);
});

test('reconcileTotal は不一致を検出する（不一致なら書き込まない判定に使う）', () => {
  const r = reconcileTotal([{ price: 500 }], 1280);
  assert.equal(r.ok, false);
  assert.equal(r.diff, -780);
});
