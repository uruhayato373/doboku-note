/**
 * product-plan.mjs — 商品の正本（config/products.json）と、コミット済みの note の収録記録（data/note/magazines.json）の差を、
 * note への反映計画（作成・改称・価格・収録の追加と外し・退役）にする（DN-0493）。
 * ---------------------------------------------------------------------------
 * 純関数だけ。ネットワークは使わず、note への書き込みもしない（実行は従来の承認つきスクリプト）。
 * npm run product -- plan と、管理画面の商品設計（/product/design）が同じ結果を読む。
 * 収録の意図は expectedMembers（members＋includes の展開）。公開済みで noteId のある記事だけ数え、未公開の原稿は pending に分ける。
 */
import { expectedMembers, noteKeyOf } from './product-registry.mjs';

const yenOf = (s) => {
  const m = String(s ?? '').match(/^¥([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/**
 * @param {object[]} products 正本の全商品
 * @param {{ magazines: { key: string, name: string, price?: number, notes?: { key: string }[] }[] } | null} snapshot 収録記録
 * @returns {{ items: object[], totals: Record<string, number>, compared: number }}
 *   item: { id, key, kind, title, detail?, command? }。kind は create / planned / retire / rename / price / add / remove / pending
 */
export function planNote(products, snapshot) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const live = new Map((snapshot?.magazines ?? []).map((m) => [m.key, m]));
  const items = [];
  let compared = 0;
  for (const p of products.filter((x) => x.channel === 'note' && x.tier !== 'membership')) {
    const key = noteKeyOf(p.catalog.noteUrl);
    const title = p.catalog.noteTitle ?? p.catalog.title ?? p.id;
    const base = { id: p.id, key, title };
    const dirArg = p.cover ? ` --dir "${p.cover.magazineDir}"` : ' --dir <マガジンのディレクトリ>';
    if (p.catalog.retiredAt) {
      if (key && live.has(key)) items.push({ ...base, kind: 'retire', detail: `退役（${p.catalog.retiredAt}）なのに note に残っている`, command: `npm run note-magazine-delete -- --keys ${key}` });
      continue;
    }
    if (!p.catalog.published) {
      items.push({ ...base, kind: 'planned', detail: '作成予定（未公開）' });
      continue;
    }
    if (!key) continue; // 単品 SKU（/n/）は記事。収録の差は含まれるマガジン側で見る
    const cur = live.get(key);
    if (!cur) {
      items.push({ ...base, kind: 'create', detail: '正本にあるが note に無い', command: `node scripts/note-magazine-create.mjs${dirArg} --commit` });
      continue;
    }
    if (cur.name !== title) items.push({ ...base, kind: 'rename', detail: `note: ${cur.name}`, command: `npm run note-edit-magazine -- --key ${key} --meta <note掲載文の置き場>` });
    const want = yenOf(p.catalog.price);
    if (want !== null && typeof cur.price === 'number' && cur.price !== want) items.push({ ...base, kind: 'price', detail: `note ¥${cur.price} → 正本 ¥${want}`, command: `npm run note-edit-magazine -- --key ${key} --meta <note掲載文の置き場>` });
    const { ids, pending, missing } = expectedMembers(p, byId);
    for (const m of missing) items.push({ ...base, kind: 'missing', detail: `収録の意図に解決できない ${m}` });
    if (pending.length) items.push({ ...base, kind: 'pending', detail: `未公開の原稿 ${pending.length} 本（公開後に収録）` });
    compared++;
    const got = new Set((cur.notes ?? []).map((n) => n.key));
    const notIn = [...ids].filter((k) => !got.has(k));
    const extra = [...got].filter((k) => !ids.has(k));
    if (notIn.length) items.push({ ...base, kind: 'add', detail: `未収録 ${notIn.length} 本（${notIn.slice(0, 3).join(', ')}${notIn.length > 3 ? ' …' : ''}）`, command: `npm run note-magazine-add -- --target ${key} --notes ${notIn.join(',')} --commit` });
    if (extra.length) items.push({ ...base, kind: 'remove', detail: `意図に無い収録 ${extra.length} 本（${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ' …' : ''}）`, command: 'note の画面で外す（自動化なし）' });
  }
  const totals = {};
  for (const it of items) totals[it.kind] = (totals[it.kind] ?? 0) + 1;
  return { items, totals, compared };
}
