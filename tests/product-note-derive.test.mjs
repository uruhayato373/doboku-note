// ペルソナ別パックの導線・カバー・掲載文は、正本（config/products.json）から作る生成物（DN-0493）。
// 完了条件: 2級土木でパック 1 本を足す作業は「正本に足す → gen」だけで、正本以外の手で直すファイルが無い
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadProducts, ROOT } from '../scripts/lib/product-registry.mjs';
import { planNote } from '../scripts/lib/product-plan.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import {
  deriveIntroStandard, deriveCovers, deriveListings, parsePersonaBrief, personaPacks, renderIntroRules, INTRO_VARIANT_QUALIFICATION,
} from '../scripts/lib/product-note-derive.mjs';

const { products, articlePrices } = loadProducts();
const std = readDataset(ROOT, 'config.note-intro-standard');
const covers = readDataset(ROOT, 'config.note-covers');
const VARIANT = 'civil2';
const QUALIFICATION = INTRO_VARIANT_QUALIFICATION[VARIANT];
const root = std.variants[VARIANT].root;

test('いまのファイルは正本から作った結果と一致している（gen 済み）', () => {
  const intro = deriveIntroStandard(std, products);
  assert.deepEqual(intro.errors, []);
  assert.deepEqual(intro.next, std);
  assert.ok(intro.rules > 0 && intro.magazines > 0, '検査ゼロを緑にしない');
  assert.deepEqual(deriveCovers(covers, products), covers);
  const { files, errors } = deriveListings(products, articlePrices);
  assert.deepEqual(errors, []);
  assert.equal(files.length, personaPacks(products).length);
  for (const f of files) assert.equal(readFileSync(join(ROOT, f.rel), 'utf8'), f.text, f.rel);
});

/** 正本に足す 1 パック（想定工事バンクの新しい工事 2 本・バンクの includes にも足す） */
function withNewPack() {
  const folder = (n) => `${root}/magazines/2級土木-想定工事バンク/工事${n}-テスト工事/article.md`;
  const members = [folder(998), folder(999)];
  const pack = {
    id: 'civil-2-keiken-fixture-pack',
    channel: 'note',
    qualification: QUALIFICATION,
    stage: 'second',
    series: 'keiken',
    tier: 'magazine',
    persona: 'K',
    cover: { magazineDir: 'content/note/1級・2級土木/2級土木/magazines/2級土木-試験用8工事', qualifier: '2級土木｜施工経験記述', magazineName: '試験用', proof: '試験用の2工事', benefit: '試験に使う' },
    listing: { appeal: '試験用のアピールです。' },
    catalog: {
      id: 'civil-2-keiken-fixture-pack',
      published: true,
      noteUrl: 'https://note.com/dobokunote/m/m0000000000ff',
      noteTitle: '2級土木 施工経験記述｜試験用の工事 2工事',
      title: '2級土木 施工経験記述｜試験用の工事 2工事',
      description: '試験用の工事を担当している方向けに、施工経験記述の想定工事を選んだペルソナ別セット。試験用A、試験用Bの2工事×5管理を収録。想定工事バンクと同じ記事のため、同バンク購入者は追加購入不要。',
      price: '¥2,480（2工事セット）',
    },
    members,
    includes: [],
    memo: [],
  };
  const next = products.map((p) => (p.id === 'civil-2-koji-bank' ? { ...p, includes: [...p.includes, pack.id] } : p));
  return { next: [...next, pack], pack, prices: { ...articlePrices, [members[0]]: 1680, [members[1]]: 1680 } };
}

test('パック 1 本を正本に足して gen すると、導線・カバー・掲載文のそのパック分だけが増える', () => {
  const { next, pack, prices } = withNewPack();

  const intro = deriveIntroStandard(std, next);
  assert.deepEqual(intro.errors, []);
  const before = std.variants[VARIANT];
  const after = intro.next.variants[VARIANT];
  // 冒頭導線: magazines に 1 件、rules に（記事フォルダごとの）2 件が増え、ほかは 1 文字も変わらない
  assert.deepEqual(Object.keys(after.magazines).filter((k) => !(k in before.magazines)), [pack.id]);
  assert.equal(after.magazines[pack.id].url, pack.catalog.noteUrl);
  assert.equal(after.magazines[pack.id].title, '2級土木 施工経験記述 試験用の工事 2工事');
  assert.equal(after.magazines[pack.id].desc, '試験用の工事を担当している人向けに、近い工事2件を5管理で書き分けたマガジンです。');
  for (const k of Object.keys(before.magazines)) assert.deepEqual(after.magazines[k], before.magazines[k]);
  const added = after.rules.filter((r) => !before.rules.some((b) => JSON.stringify(b) === JSON.stringify(r)));
  assert.deepEqual(added.map((r) => r.home), [pack.id, pack.id]);
  assert.deepEqual(added.map((r) => r.upper), ['civil-2-koji-bank', 'civil-2-koji-bank']);
  assert.ok(added.every((r) => r._generated === true && r.dq === true));
  assert.equal(after.rules.length, before.rules.length + 2);
  // 追加した規則は、バンクの広い規則（想定工事バンク/）より前に置かれる（最初の一致で収録元になる）
  const rel = pack.members[0].slice(root.length + 1);
  assert.equal(after.rules.find((r) => rel.includes(r.match)).home, pack.id);
  for (const v of Object.keys(std.variants)) if (v !== VARIANT) assert.deepEqual(intro.next.variants[v], std.variants[v]);

  // カバー設定: additionalMagazines に 1 行だけ増え、既存の行は同じ並びのまま
  const c = deriveCovers(covers, next);
  const beforeList = covers.characterCovers.additionalMagazines;
  const afterList = c.characterCovers.additionalMagazines;
  assert.equal(afterList.length, beforeList.length + 1);
  assert.deepEqual(afterList.filter((e) => e.id !== pack.id), beforeList);
  assert.deepEqual(afterList.find((e) => e.id === pack.id), { id: pack.id, ...pack.cover });
  assert.deepEqual({ ...c, characterCovers: { ...c.characterCovers, additionalMagazines: beforeList } }, covers);

  // 掲載文: そのパックの 1 本が増え、ほかの本は変わらない
  const base = deriveListings(products, articlePrices).files;
  const withNew = deriveListings(next, prices);
  assert.deepEqual(withNew.errors, []);
  assert.deepEqual(withNew.files.filter((f) => f.id !== pack.id), base);
  const mine = withNew.files.find((f) => f.id === pack.id);
  assert.equal(mine.rel, `${pack.cover.magazineDir}/note掲載文.txt`);
  assert.match(mine.text, /\n■ マガジンタイトル（30字以内）\n\n2級土木 施工経験記述｜試験用の工事 2工事\n/);
  assert.match(mine.text, /セット ¥2,480（2工事）。有料記事は単品各 ¥1,680。/);
  assert.match(mine.text, /試験用A、試験用Bの2工事を収録。/);
  assert.match(mine.text, /試験用のアピールです。/);
  assert.match(mine.text, /セット価格: 2480\n単品価格: 1680\n$/);
});

test('複数のパックに入る記事の収録元は persona の順で最初のパック。intro.notHome で例外にできる', () => {
  const { next, pack } = withNewPack();
  const shared = products.find((p) => p.id === 'civil-2-keiken-bridge-repair-pack').members[0];
  const a = next.map((p) => (p.id === pack.id ? { ...p, persona: 'A0', members: [shared] } : p));
  const rule = (list) => renderIntroRules(list, QUALIFICATION, root).rules.find((r) => shared.includes(r.match));
  assert.equal(rule(a).home, pack.id, 'persona A0 が最初');
  const b = a.map((p) => (p.id === pack.id ? { ...p, intro: { notHome: [shared] } } : p));
  assert.equal(rule(b).home, 'civil-2-keiken-bridge-repair-pack', 'notHome にすると次のパック');
  const c = a.map((p) => (p.id === pack.id ? { ...p, intro: { notHome: ['content/note/無い.md'] } } : p));
  assert.match(renderIntroRules(c, QUALIFICATION, root).errors.join(), /members に無い/);
});

test('説明が定型でないパックは導線・掲載文を作らずに投げる（黙って空にしない）', () => {
  const p = products.find((x) => x.id === 'civil-2-keiken-paving-pack');
  assert.equal(parsePersonaBrief(p).count, p.members.length);
  assert.throws(() => parsePersonaBrief({ id: 'x', catalog: { description: '自由な説明' } }), /定型でない/);
});

test('ペルソナ別パックの掲載文の置き場（cover.magazineDir）は実在する', () => {
  for (const p of personaPacks(products)) assert.ok(existsSync(join(ROOT, p.cover.magazineDir)), p.cover.magazineDir);
});

// ---- plan: 正本と note の収録記録の差 → 反映計画 ----

const noteProduct = (id, over = {}) => ({
  id, channel: 'note', qualification: 'civil-construction-2', stage: 'second', series: 'keiken', tier: 'magazine', persona: null, members: [], includes: [], memo: [],
  catalog: { id, published: true, noteUrl: `https://note.com/dobokunote/m/m${id.length}abc`, noteTitle: `題名 ${id}`, price: '¥2,480（2工事セット）', ...over.catalog },
  ...over.top,
});

test('planNote: 作成・改称・価格・収録の追加と外し・退役・作成予定を出す。差が無ければ空', () => {
  const ok = noteProduct('aa', { top: { members: ['note:n111'] } });
  const key = (p) => p.catalog.noteUrl.match(/\/m\/(m[0-9a-f]+)/)[1];
  const snap = (over = {}) => ({ magazines: [{ key: key(ok), name: '題名 aa', price: 2480, notes: [{ key: 'n111' }], ...over }] });
  assert.deepEqual(planNote([ok], snap()).items, []);
  assert.equal(planNote([ok], snap()).compared, 1);
  const kinds = (items) => items.map((i) => i.kind);
  assert.deepEqual(kinds(planNote([ok], snap({ name: '旧題名' })).items), ['rename']);
  assert.deepEqual(kinds(planNote([ok], snap({ price: 1980 })).items), ['price']);
  assert.deepEqual(kinds(planNote([ok], snap({ notes: [] })).items), ['add']);
  assert.deepEqual(kinds(planNote([ok], snap({ notes: [{ key: 'n111' }, { key: 'n999' }] })).items), ['remove']);
  // 正本にあって note に無い公開済み商品は作成（cover があれば掲載文の置き場を --dir に入れる）
  const fresh = noteProduct('bbbb', { top: { cover: { magazineDir: 'content/note/x/新パック' } } });
  const created = planNote([ok, fresh], snap()).items.find((i) => i.kind === 'create');
  assert.equal(created.id, 'bbbb');
  assert.match(created.command, /note-magazine-create\.mjs --dir "content\/note\/x\/新パック" --commit/);
  // 退役済みで note に残っているものは退役、未公開は作成予定
  const retired = noteProduct('cc', { catalog: { published: false, retiredAt: '2026-10-01' } });
  const planned = noteProduct('dd', { catalog: { published: false } });
  const live = { magazines: [{ key: key(retired), name: 'x', price: 0, notes: [] }] };
  assert.deepEqual(kinds(planNote([retired, planned], live).items), ['retire', 'planned']);
});
