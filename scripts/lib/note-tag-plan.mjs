// note-tag-plan.mjs — 公開記事のハッシュタグを原稿（hashtags*.txt）へ寄せる計画を決める（純関数）。
//
// note-sync-tags が使う。ライブ（note API の hashtag_notes）と原稿を突き合わせ、
//   missing … 原稿にあってライブに無い
//   extra   … ライブにあって原稿に無い（prune のときだけ削除対象）
//   addable … missing のうち上限 99 に収まる分（prune なら extra を消した後の空きで数える）
// を返す。note は上限 99 を超える保存を全体ごと拒否するため、addable は必ず上限内に切る。

export const NOTE_TAG_CAP = 99;

// note のタグは大文字小文字を区別しない（原稿 GX を足してもライブは既存の gx のまま・2026-09-23 実測）。
// 比較はこのキーで行い、大文字小文字だけの違いは「一致」とみなす（消して足し直しても変わらないため）。
export const tagKey = (t) => t.toLowerCase();

export function planTagSync({ live, desired, prune = false, cap = NOTE_TAG_CAP }) {
  const liveSet = new Set(live.map(tagKey));
  const desiredSet = new Set(desired.map(tagKey));
  const missing = desired.filter((t) => !liveSet.has(tagKey(t)));
  const extraAll = live.filter((t) => !desiredSet.has(tagKey(t)));
  const extra = prune ? extraAll : [];
  const kept = live.length - extra.length;
  const addable = missing.slice(0, Math.max(0, cap - kept));
  return {
    missing,
    extra,
    extraCount: extraAll.length,
    addable,
    overflow: missing.length - addable.length,
    willBe: kept + addable.length,
    changed: addable.length > 0 || extra.length > 0,
  };
}

// 保存後のライブを計画どおりか判定する。prune では「消すはずのタグが残っていない」も見る。
// rejected は入力欄が受け付けなかったタグ（i-Construction など・2026-09-23 実測）。保存の失敗ではないので
// notAdded から外し、別枠で返す（原稿側で直すもの）。
export function verifyTagSync({ after, plan, liveCount, rejected = [] }) {
  const afterSet = new Set(after.map(tagKey));
  const rejectedSet = new Set(rejected.map(tagKey));
  const leftover = plan.extra.filter((t) => afterSet.has(tagKey(t)));
  const missingAfter = plan.addable.filter((t) => !afterSet.has(tagKey(t)));
  const notAdded = missingAfter.filter((t) => !rejectedSet.has(tagKey(t)));
  const rejectedMissing = missingAfter.filter((t) => rejectedSet.has(tagKey(t)));
  if (plan.extra.length) {
    if (leftover.length || notAdded.length) return { ok: false, leftover, notAdded, rejected: rejectedMissing };
    return { ok: true, leftover, notAdded, rejected: rejectedMissing };
  }
  // 追加だけのとき: 件数が増えていなければ保存が拒否された（上限超過など）。全部が入力不可なら増えないのが正しい
  if (after.length <= liveCount && rejectedMissing.length < plan.addable.length) return { ok: false, leftover, notAdded, rejected: rejectedMissing, reason: 'count-not-increased' };
  if (notAdded.length) return { ok: false, leftover, notAdded, rejected: rejectedMissing };
  return { ok: true, leftover, notAdded, rejected: rejectedMissing };
}

// 公開設定のタグ chip（<button>#タグ<削除アイコン></button>）の文字に一致させる正規表現。
// textContent は SVG 由来の改行が後ろに付く（"#まとめ\n\n"）ため、アンカーの内側で空白を許す。
export function tagChipPattern(tag) {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*#${esc}\\s*$`);
}
