/**
 * EXP-053: 本文中の note 案内（MagazineHeroCta・MagazineInlineCard）を、POP 画像（image）と文字のカード（text＝画像を入れる前の
 * 商品名・説明つきのカード）で訪問者ごとに出し分け、表示あたりのクリックを比べる（DN-0949）。
 * 2026-10-02〜03 に本文中のカードを画像へ替えた後、同じラベルの本文カードのクリック率が約 4 分の 1 に下がった（冒頭・資格トップは
 * 横ばい）。季節（二次試験の後）と分けるため前後比較でなく同時の A/B にする。
 *
 * 割り当ては <head> の小さなスクリプト（NOTE_BODY_VARIANT_SCRIPT）が描画前に <html data-note-body-variant> へ書き、
 * CSS（globals.css）が選ばれなかった案を display:none にする。表示されない案は IntersectionObserver が交差しないので、
 * 表示・クリックは見えている案だけに入る。JS が無い・保存できないときは image（今の既定）を見せる。
 * 計測は AnalyticsProvider が note_body_experiment_impression / _click（event_label＝noteBodyExperimentLabel）を
 * 既存の note_cta_* と並行して送る。
 */
export const NOTE_BODY_EXPERIMENT_ID = 'EXP-053';
export const NOTE_BODY_VARIANTS = ['image', 'text'];
export const NOTE_BODY_VARIANT_KEY = 'doboku-note:EXP-053:variant';
export const NOTE_BODY_EXPERIMENT_EVENTS = ['note_body_experiment_impression', 'note_body_experiment_click'];

/** storage が使えない・壊れているときは random で決め、保存に失敗しても戻り値をそのページで使う */
export function assignNoteBodyVariant(storage, random = Math.random) {
  try {
    const saved = storage?.getItem(NOTE_BODY_VARIANT_KEY);
    if (NOTE_BODY_VARIANTS.includes(saved)) return saved;
  } catch { /* 保存を拒否されてもページは表示する */ }
  const variant = NOTE_BODY_VARIANTS[random() < 0.5 ? 0 : 1];
  try { storage?.setItem(NOTE_BODY_VARIANT_KEY, variant); } catch { /* ページ内で固定する */ }
  return variant;
}

/** <head> に置く描画前のスクリプト。assignNoteBodyVariant と同じ判定（テストで突き合わせる） */
export const NOTE_BODY_VARIANT_SCRIPT = `(function(){var k='${NOTE_BODY_VARIANT_KEY}',v;try{v=localStorage.getItem(k)}catch(e){}if(v!=='image'&&v!=='text'){v=Math.random()<0.5?'image':'text';try{localStorage.setItem(k,v)}catch(e){}}document.documentElement.setAttribute('data-note-body-variant',v)})()`;

/** event_label。案・置き場所・note の CTA ラベル（<商品ID>:<面>）を並べる。個人情報は含めない */
export function noteBodyExperimentLabel(variant, placement, ctaLabel) {
  return `${NOTE_BODY_EXPERIMENT_ID}|${variant}|${placement}|${ctaLabel}`;
}

export function parseNoteBodyExperimentLabel(label) {
  const [experiment, variant, placement, ctaLabel, extra] = String(label).split('|');
  if (experiment !== NOTE_BODY_EXPERIMENT_ID || !NOTE_BODY_VARIANTS.includes(variant) || !placement || !ctaLabel || extra !== undefined) return null;
  return { experiment, variant, placement, ctaLabel, productId: ctaLabel.split(':')[0] };
}
