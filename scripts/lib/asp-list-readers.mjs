/**
 * asp-list-readers.mjs — ASP の提携一覧・詳細ページの文字から状態を読む純関数（affiliate-status が使う）。
 *
 * 2026-10-30 に affiliate:status が A8・もしもで 0 件を返した（DN-0921）。原因は 2 つ:
 *   - A8 の一覧は開いたあとで中身を描画する。描画前は「該当なし」が出ていて、そこを読んでいた。1 ページ 20 件の既定で全件も読めていなかった
 *   - もしもの一覧の文字には promotion_id が出ないので、ID 照合では 1 件も当たらなかった
 * ブラウザに触れる部分は affiliate-status に残し、判定だけをここに置いてテストする。
 */

/** 一覧の文字から ID を集める（pattern は 1 件の ID に当たる正規表現。捕捉グループがあればその中身） */
export function extractListIds(text, pattern) {
  const ids = new Set();
  if (!pattern) return ids;
  const re = new RegExp(pattern.replace(/^\^|\$$/g, ''), 'gm');
  for (const m of String(text ?? '').matchAll(re)) ids.add(m[1] ?? m[0]);
  return ids;
}

/** ページ番号と件数を URL のクエリに載せたパス（paging が無ければそのまま） */
export function pagedPath(path, paging, pageNo) {
  if (!paging) return path;
  const [base, query = ''] = path.split('?');
  const q = new URLSearchParams(query);
  q.set(paging.pageParam, String(pageNo));
  if (paging.sizeParam) q.set(paging.sizeParam, String(paging.pageSize));
  return `${base}?${q.toString()}`;
}

const BADGES = { 提携中: 'approved', 申請中: 'applying', 否認: 'none', 否認中: 'none', 提携解除: 'none' };

/**
 * もしもの詳細ページの状態を読む。返り値は approved / applying / none / null（読めない）。
 * バッジはタイトル直下で「成果XXXX円」の次の行に単独で出る。凡例やサイドバーの絞り込み（申請中/提携中/否認中）にも
 * 同じ語があるので、全文検索はしない。バッジが無く申請ボタンがあれば未提携。どちらも無ければ読めていない（null）。
 */
export function parseDetailStatus(text, { anchor, applyLabel } = {}) {
  const all = String(text ?? '');
  const scoped = anchor && all.includes(anchor) ? all.slice(all.indexOf(anchor)) : all;
  const lines = scoped.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const reward = lines.findIndex((l) => /^成果\s*[\d,]+\s*円/.test(l));
  if (reward >= 0 && BADGES[lines[reward + 1]]) return BADGES[lines[reward + 1]];
  if (applyLabel && lines.includes(applyLabel)) return 'none';
  return null;
}
