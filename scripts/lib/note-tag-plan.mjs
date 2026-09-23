// note-tag-plan.mjs — 公開記事のハッシュタグを原稿（hashtags*.txt）へ寄せる計画を決める（純関数）。
//
// note-sync-tags が使う。ライブ（note API の hashtag_notes）と原稿を突き合わせ、
//   missing … 原稿にあってライブに無い
//   extra   … ライブにあって原稿に無い（prune のときだけ削除対象）
//   addable … missing のうち上限 99 に収まる分（prune なら extra を消した後の空きで数える）
// を返す。note は上限 99 を超える保存を全体ごと拒否するため、addable は必ず上限内に切る。

export const NOTE_TAG_CAP = 99;

export function planTagSync({ live, desired, prune = false, cap = NOTE_TAG_CAP }) {
  const liveSet = new Set(live);
  const desiredSet = new Set(desired);
  const missing = desired.filter((t) => !liveSet.has(t));
  const extraAll = live.filter((t) => !desiredSet.has(t));
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
export function verifyTagSync({ after, plan, liveCount }) {
  const afterSet = new Set(after);
  const leftover = plan.extra.filter((t) => afterSet.has(t));
  const notAdded = plan.addable.filter((t) => !afterSet.has(t));
  if (plan.extra.length) {
    if (leftover.length || notAdded.length) return { ok: false, leftover, notAdded };
    return { ok: true, leftover, notAdded };
  }
  // 追加だけのとき: 件数が増えていなければ保存が拒否された（上限超過など）
  if (after.length <= liveCount) return { ok: false, leftover, notAdded, reason: 'count-not-increased' };
  return { ok: true, leftover, notAdded };
}

// 公開設定のタグ chip（<button>#タグ<削除アイコン></button>）の文字に一致させる正規表現。
// textContent は SVG 由来の改行が後ろに付く（"#まとめ\n\n"）ため、アンカーの内側で空白を許す。
export function tagChipPattern(tag) {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*#${esc}\\s*$`);
}
