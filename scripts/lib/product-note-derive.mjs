/**
 * product-note-derive.mjs — 商品の正本（config/products.json）から、note の冒頭導線・カバー設定・掲載文を作る（DN-0493）。
 * ---------------------------------------------------------------------------
 * 対象は「ペルソナ別パック」＝ cover を持つ note マガジン（今は 2級土木の想定工事バンクから切り出した 10 本）。
 *   - 冒頭導線  config/note-intro-standard.json の variants.<型>:
 *       magazines の 1 件（url・題名・説明）と、収録記事ごとの rules（`_generated: true`）
 *   - カバー設定 config/note-covers.json の characterCovers.additionalMagazines の 1 行
 *   - 掲載文     <cover.magazineDir>/note掲載文.txt の全文
 * 入力は正本の persona・members・catalog・cover・listing・intro だけ。ここに置くのは純関数（render*）と、
 * 設定ファイル・掲載文を正本に合わせる同期（sync*・check なら書かずに差分だけ返す）。
 * 説明文の audience・works は catalog.description の定型（parsePersonaBrief）から取る。定型でなければ投げる（check-products が止める）。
 * 手書きのまま残すもの: 型の共通部（root・banner・coconala）、ペルソナ別パック以外のマガジンの題名・説明、それらの rules。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, loadProducts } from './product-registry.mjs';
import { readDataset } from './dataset-io.mjs';
import { writeDataset } from './dataset-write.mjs';

/** 冒頭導線の型 → 資格（型の root は note-intro-standard.json が持つ） */
export const INTRO_VARIANT_QUALIFICATION = { civil2: 'civil-construction-2' };

export const LISTING_FILE = 'note掲載文.txt';
const BAR = '━'.repeat(28);

const DESC_RE = /^(.+)方向けに、施工経験記述の想定工事を選んだペルソナ別セット。(.+)の(\d+)工事×5管理を収録。想定工事バンクと同じ記事のため、同バンク購入者は追加購入不要。$/;
const PRICE_RE = /^(¥[\d,]+)（(\d+)工事セット）$/;

/** ペルソナ別パック（cover を持つ note マガジン）。persona 順→id 順 */
export function personaPacks(products, qualification) {
  return products
    .filter((p) => p.channel === 'note' && p.cover && (!qualification || p.qualification === qualification))
    .sort((a, b) => String(a.persona ?? '').localeCompare(String(b.persona ?? '')) || a.id.localeCompare(b.id));
}

/** catalog.description の定型から対象読者・工事の例・件数を取る。定型でなければ投げる */
export function parsePersonaBrief(product) {
  const m = String(product.catalog.description ?? '').match(DESC_RE);
  if (!m) throw new Error(`${product.id}: catalog.description が定型でない（「<読者>方向けに、施工経験記述の想定工事を選んだペルソナ別セット。<工事の例>の<N>工事×5管理を収録。想定工事バンクと同じ記事のため、同バンク購入者は追加購入不要。」）`);
  return { audience: m[1], works: m[2], count: Number(m[3]) };
}

const noteTitleOf = (p) => p.catalog.noteTitle ?? p.catalog.title;

/** 冒頭導線の magazines の 1 件 */
export function renderIntroMagazine(product) {
  const { audience, count } = parsePersonaBrief(product);
  return {
    url: product.catalog.noteUrl,
    title: noteTitleOf(product).replace('｜', ' '),
    desc: `${audience}人向けに、近い工事${count}件を5管理で書き分けたマガジンです。`,
  };
}

/** カバー設定の additionalMagazines の 1 行（キー順は既存の行と同じ） */
export function renderCoverEntry(product) {
  const c = product.cover;
  return { id: product.id, magazineDir: c.magazineDir, qualifier: c.qualifier, magazineName: c.magazineName, proof: c.proof, benefit: c.benefit };
}

/** 記事（members の 1 本）が属する「記事のフォルダ」を root からの相対で返す。root の外なら null */
function articleFolder(member, root) {
  const prefix = `${root}/`;
  if (!member.startsWith(prefix)) return null;
  const rel = member.slice(prefix.length);
  const i = rel.lastIndexOf('/');
  return i < 0 ? null : `${rel.slice(0, i)}/`;
}

/**
 * 収録元（home）の決め方: 記事を members に持つペルソナ別パックのうち、persona 順で最初の、その記事が intro.notHome でないもの。
 * 規則は記事のフォルダごとに 1 行（match は root からのフォルダ。上位 upper はそのパックを includes に持つ商品）
 * @returns {{ rules: object[], errors: string[] }}
 */
export function renderIntroRules(products, qualification, root) {
  const packs = personaPacks(products, qualification);
  const errors = [];
  const rules = [];
  const seen = new Set();
  for (const pack of packs) {
    for (const member of pack.members) {
      const folder = articleFolder(member, root);
      if (!folder) {
        errors.push(`${pack.id}: members の ${member} が型の root（${root}）の外`);
        continue;
      }
      if (seen.has(folder)) continue;
      seen.add(folder);
      const home = packs.find((p) => p.members.includes(member) && !(p.intro?.notHome ?? []).includes(member));
      if (!home) {
        errors.push(`${member}: 収録元にできるパックが無い（intro.notHome で全部外している）`);
        continue;
      }
      const upper = products.find((p) => p.channel === 'note' && p.includes.includes(home.id))?.id ?? null;
      rules.push({ match: folder, home: home.id, upper, dq: home.series === 'keiken', _generated: true });
    }
  }
  for (const pack of packs) for (const m of pack.intro?.notHome ?? []) if (!pack.members.includes(m)) errors.push(`${pack.id}: intro.notHome の ${m} が members に無い`);
  return { rules, errors };
}

/** 掲載文の価格行・機械用の欄に要る金額 */
function listingPrices(product, articlePrices) {
  const m = String(product.catalog.price ?? '').match(PRICE_RE);
  if (!m) throw new Error(`${product.id}: catalog.price が「¥2,480（12工事セット）」の形でない（${product.catalog.price}）`);
  const paid = product.members.map((x) => articlePrices[x]).filter((y) => y > 0);
  if (!paid.length || !paid.every((y) => y === paid[0])) throw new Error(`${product.id}: members の単品価格が 1 つに決まらない（articlePrices）`);
  return { setLabel: m[1], count: Number(m[2]), setYen: Number(m[1].replace(/[¥,]/g, '')), articleYen: paid[0] };
}

/** note掲載文.txt の全文（LF・末尾改行。ペルソナ別パックの定型） */
export function renderListing(product, articlePrices) {
  const { audience, works, count } = parsePersonaBrief(product);
  const prices = listingPrices(product, articlePrices);
  if (prices.count !== count) throw new Error(`${product.id}: catalog.price の工事数（${prices.count}）と description の工事数（${count}）が違う`);
  if (product.members.length !== count) throw new Error(`${product.id}: members が ${product.members.length} 本で、catalog の工事数（${count}）と違う`);
  const title = noteTitleOf(product);
  const lead = title.split(' ')[0];
  return [
    BAR,
    'note マガジン掲載文（コピペ用）',
    title.replace(' 施工経験記述｜', '｜'),
    BAR,
    '',
    '■ マガジンタイトル（30字以内）',
    '',
    title,
    '',
    '■ 価格',
    '',
    `セット ${prices.setLabel}（${count}工事）。有料記事は単品各 ¥${prices.articleYen.toLocaleString('en-US')}。`,
    '',
    '■ 説明（400字以内）',
    '',
    `${lead}施工管理技士の施工経験記述を、${audience}方向けに選んだセットです。${works}の${count}工事を収録。各工事で品質・安全・工程の3管理と、施工計画・環境対策を用意しています。想定工事バンクに収録済みの同一記事を、仕事の種類で選べるよう再編集したセットです。想定工事バンク購入者は追加購入不要です。答案は自分の工事条件へ置き換えて使用してください。`,
    '',
    '■ アピールポイント（250字以内）',
    '',
    product.listing.appeal,
    '',
    '■ 機械用（編集しない・自動同期）',
    '',
    `セット価格: ${prices.setYen}`,
    `単品価格: ${prices.articleYen}`,
    '',
  ].join('\n');
}

// ---- 導出（正本と設定を渡すと、あるべき設定を返す純関数） ----

/** オブジェクトの key 順を保って置き換える。無いキーは最後の生成済みキーの後ろ（生成済みが無ければ末尾）へ足す */
function mergeKeyed(current, generated, isGenerated) {
  const out = {};
  const pending = new Map(generated);
  const keys = Object.keys(current);
  const lastGenerated = keys.reduce((acc, k, i) => (isGenerated(k) ? i : acc), -1);
  keys.forEach((k, i) => {
    out[k] = pending.has(k) ? pending.get(k) : current[k];
    pending.delete(k);
    if (i === lastGenerated) {
      for (const [nk, nv] of pending) out[nk] = nv;
      pending.clear();
    }
  });
  for (const [nk, nv] of pending) out[nk] = nv;
  return out;
}

/** 冒頭導線の標準（型ごと）を正本に合わせた全体。{ next, magazines, rules, errors } */
export function deriveIntroStandard(std, products) {
  const next = structuredClone(std);
  const out = { next, magazines: 0, rules: 0, errors: [] };
  for (const [variant, qualification] of Object.entries(INTRO_VARIANT_QUALIFICATION)) {
    const v = next.variants[variant];
    if (!v) {
      out.errors.push(`note-intro-standard.json に型 ${variant} が無い`);
      continue;
    }
    const packs = personaPacks(products, qualification);
    if (!packs.length) continue;
    const gen = new Map(packs.map((p) => [p.id, renderIntroMagazine(p)]));
    v.magazines = mergeKeyed(v.magazines, gen, (k) => gen.has(k));
    out.magazines += gen.size;
    const { rules, errors } = renderIntroRules(products, qualification, v.root);
    out.errors.push(...errors);
    out.rules += rules.length;
    const first = v.rules.findIndex((r) => r._generated);
    const rest = v.rules.filter((r) => !r._generated);
    // 置き場: 既存の生成済みの規則の位置。初回は、生成する規則を隠してしまう広い規則（match がそのフォルダの手前までの接頭辞）の直前
    const shadow = rest.findIndex((r) => r.match !== '' && rules.some((g) => g.match.startsWith(r.match)));
    const at = first >= 0 ? v.rules.slice(0, first).filter((r) => !r._generated).length : shadow >= 0 ? shadow : rest.length;
    v.rules = [...rest.slice(0, at), ...rules, ...rest.slice(at)];
  }
  return out;
}

/** カバー設定を正本に合わせた全体（additionalMagazines の生成済みの行を置き換え、新しい行は最後の生成済みの行の後ろへ） */
export function deriveCovers(cfg, products) {
  const packs = personaPacks(products);
  const next = structuredClone(cfg);
  if (!packs.length) return next;
  const gen = new Map(packs.map((p) => [p.id, renderCoverEntry(p)]));
  const list = next.characterCovers.additionalMagazines;
  next.characterCovers.additionalMagazines = Object.values(mergeKeyed(Object.fromEntries(list.map((e) => [e.id, e])), gen, (k) => gen.has(k)));
  return next;
}

/** 掲載文（listing を持つ商品）の { rel, id, text }。作れない商品は errors */
export function deriveListings(products, articlePrices) {
  const files = [];
  const errors = [];
  for (const p of products.filter((x) => x.channel === 'note' && x.cover && x.listing)) {
    try {
      files.push({ rel: `${p.cover.magazineDir}/${LISTING_FILE}`, id: p.id, text: renderListing(p, articlePrices) });
    } catch (e) {
      errors.push(e.message);
    }
  }
  return { files, errors };
}

// ---- 同期（ファイルを正本に合わせる。check なら書かずに差分だけ返す） ----

/** 冒頭導線（型ごとの magazines と rules） */
export function syncIntroStandard({ check = false } = {}) {
  const { products } = loadProducts();
  const std = readDataset(ROOT, 'config.note-intro-standard');
  const { next, magazines, rules, errors } = deriveIntroStandard(std, products);
  const changed = !errors.length && JSON.stringify(next) !== JSON.stringify(std);
  if (changed && !check) writeDataset(ROOT, 'config.note-intro-standard', next);
  return { magazines, rules, errors, changed };
}

/** カバー設定の additionalMagazines */
export function syncCovers({ check = false } = {}) {
  const { products } = loadProducts();
  const cfg = readDataset(ROOT, 'config.note-covers');
  const next = deriveCovers(cfg, products);
  const changed = JSON.stringify(next) !== JSON.stringify(cfg);
  if (changed && !check) writeDataset(ROOT, 'config.note-covers', next);
  return { entries: personaPacks(products).length, changed };
}

/** 掲載文。改行コードは既存のファイルのまま */
export function syncListings({ check = false } = {}) {
  const { products, articlePrices } = loadProducts();
  const { files, errors } = deriveListings(products, articlePrices);
  const out = { files: files.length, mismatch: [], rewritten: 0, errors };
  for (const f of files) {
    const abs = join(ROOT, f.rel);
    const raw = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (raw !== null && raw.replace(/\r\n/g, '\n') === f.text) continue;
    out.mismatch.push({ rel: f.rel, id: f.id });
    if (check) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, raw?.includes('\r\n') ? f.text.replace(/\n/g, '\r\n') : f.text);
    out.rewritten++;
  }
  return out;
}
