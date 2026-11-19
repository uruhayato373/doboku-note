/**
 * workflow-yaml.mjs — GitHub Actions の workflow（yaml.load 済み）から checkout の ref と run の本文を取り出す純関数。
 * check-scheduled-exec-branch（実行ブランチの対応表）と check-main-workflow-paths（main の定義が呼ぶパスの実在）が使う。
 */

/** checkout ステップの with.ref を出現順に全部（ref の無い checkout は含めない）。 */
export function checkoutRefs(doc) {
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const uses = typeof step?.uses === 'string' ? step.uses : '';
      const ref = step?.with?.ref;
      if (uses.startsWith('actions/checkout') && typeof ref === 'string' && ref.trim()) out.push(ref.trim());
    }
  }
  return out;
}

/** run ステップを出現順に全部。cwd は step の working-directory（無ければ ''）。 */
export function runSteps(doc) {
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.run === 'string') out.push({ run: step.run, cwd: typeof step['working-directory'] === 'string' ? step['working-directory'] : '' });
    }
  }
  return out;
}
