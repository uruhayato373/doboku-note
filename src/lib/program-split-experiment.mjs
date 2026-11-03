/**
 * EXP-055: 配置ルールの出し分け（config/affiliate-placements.json の splits）で、面の案件（primary）と代わりの案件（alternate）を
 * 訪問者ごとに約半分ずつ出す（DN-0952。技術士（建設部門）でビルドジョブ／ハイクラス DX・コンサル転職）。
 *
 * 割り当ては <head> の小さなスクリプト（PROGRAM_SPLIT_SCRIPT）が描画前に <html data-program-split> へ書き、
 * CSS（globals.css）が選ばれなかった方の枠（data-program-split-arm）を display:none にする。JS が無いときは primary（今の既定）。
 * 計測は既存の affiliate_cta_impression / _click（ラベルは案件ごとに違う＝BuildJob-sidebar / DXConsulting-sidebar 等）と
 * cta_placement・ページで読む。隠れた枠は IntersectionObserver が交差しないので表示・クリックに入らない。
 * 1 ページ 1 ピクセルは primary の枠だけが持つ（alternate にはピクセルを付けない）。
 */
export const PROGRAM_SPLIT_EXPERIMENT_ID = 'EXP-055';
export const PROGRAM_SPLIT_ARMS = ['primary', 'alternate'];
export const PROGRAM_SPLIT_KEY = 'doboku-note:EXP-055:arm';

export function assignProgramSplitArm(storage, random = Math.random) {
  try {
    const saved = storage?.getItem(PROGRAM_SPLIT_KEY);
    if (PROGRAM_SPLIT_ARMS.includes(saved)) return saved;
  } catch { /* 保存を拒否されてもページは表示する */ }
  const arm = PROGRAM_SPLIT_ARMS[random() < 0.5 ? 0 : 1];
  try { storage?.setItem(PROGRAM_SPLIT_KEY, arm); } catch { /* ページ内で固定する */ }
  return arm;
}

/** <head> に置く描画前のスクリプト。assignProgramSplitArm と同じ判定（テストで突き合わせる） */
export const PROGRAM_SPLIT_SCRIPT = `(function(){var k='${PROGRAM_SPLIT_KEY}',v;try{v=localStorage.getItem(k)}catch(e){}if(v!=='primary'&&v!=='alternate'){v=Math.random()<0.5?'primary':'alternate';try{localStorage.setItem(k,v)}catch(e){}}document.documentElement.setAttribute('data-program-split',v)})()`;
