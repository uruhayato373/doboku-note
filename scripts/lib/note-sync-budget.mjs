// note-sync-routine の時間と Drive の扱いの判定（純関数・2026-10-26）。
//
// 2026-10-24 の週次は、記事の同期が 180 分の段の上限で打ち切られ、実行記録も残らなかった（50/200 記事・更新 12・失敗 38）。
//   - 1 記事の更新は実測で約 3.6 分（17 記事に 61 分）。1 回 200 記事（その後 80 に絞った）は段の上限に収まらない
//   - 失敗 38 のうち 33 は配布 PDF の Drive からの取り寄せで、1 件に数分かかったうえで失敗していた（Drive の読み取りの停滞）
//   - 残り 5 は画像の挿入・エディタの読み込みの一時的な失敗で、単発で流し直せば通る種類
// そこで、上限の手前で区切りよく止めて残りを翌週へ回し、Drive が読めないときは PDF の要る記事だけを翌週へ回して
// 他の記事の更新を続け、一時的な失敗は 1 件ずつ 1 回だけやり直す。

/** 実測が無いときの 1 記事あたりの見込み（2026-10-24 の実測 3.6 分） */
export const DEFAULT_ARTICLE_MS = 3.6 * 60_000;
/** Drive の取り寄せが何件続けて失敗したら「Drive が読めない」とみなすか */
export const DRIVE_FAIL_LIMIT = 3;

/** これまでの実測（更新を試みた記事数と経過時間）から 1 記事あたりの見込みを出す。少ないうちは既定値と大きい方 */
export function perArticleMs({ articles, elapsedMs }) {
  if (!articles || articles < 3) return Math.max(DEFAULT_ARTICLE_MS, articles ? elapsedMs / articles : 0);
  return elapsedMs / articles;
}

/** 締め切りまでに更新できる記事数（max まで）。締め切りが無ければ max */
export function fitCount({ now, deadline, perMs, max }) {
  if (!deadline) return max;
  return Math.max(0, Math.min(max, Math.floor((deadline - now) / perMs)));
}

/** 一時的な失敗（単発で流し直せば通る種類）か。note-update-body の出力の行で見る */
export function isTransientFailure(reason) {
  return /画像挿入に失敗|挿入した画像がエディタに無い|editor not loaded|メニュークリック失敗/.test(String(reason || ''));
}

/** Drive の取り寄せの連続失敗を数え、読めないとみなすか・再起動を試すかを返す */
export function driveState(state, ok) {
  if (ok) return { ...state, consecutive: 0 };
  const consecutive = state.consecutive + 1;
  if (consecutive < DRIVE_FAIL_LIMIT) return { ...state, consecutive };
  if (!state.restarted) return { ...state, consecutive, restart: true };
  return { ...state, consecutive, down: true };
}
