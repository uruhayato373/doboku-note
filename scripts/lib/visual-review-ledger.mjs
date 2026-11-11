/**
 * visual-review-ledger.mjs — 「撮影 → エージェントの目視判定 → 台帳」の検査に共通の、判定の検証・対象の順番・被覆の集計。
 *
 * 使う側: scripts/standards-visual-review.mjs（基準書の章）・scripts/site-visual-review.mjs（サイトのページ × 画面幅）。
 * 対象（item）は { key, [hashField] } を持つ。ハッシュが変われば判定は古くなり、撮り直しの対象に戻る。
 * 純粋関数だけ（ファイル・ブラウザに触れない）。
 */

/**
 * 作業票の対象と判定を突き合わせ、記録してよい判定だけを返す。
 * 欠け・矛盾（判定が無い・別の回のハッシュ・見ていない撮影・major があるのに pass・決定的な崩れがあるのに pass・
 * fail なのに根拠が無い）は errors に積み、その対象は valid に入れない。
 *
 * @param {object} p
 * @param {Array<object>} p.items 作業票の対象（key・ハッシュ・shots[].file・deterministicIssues）
 * @param {Array<object>} p.verdicts エージェントが書いた判定
 * @param {string} p.hashField ハッシュの欄の名前（例 outputSha256）
 * @param {string[]} p.findingTypes 指摘の type の語彙
 * @param {string} [p.noun] エラー文での対象の呼び名（章・ページ）
 * @returns {{ valid: Array<{ item: object, verdict: 'pass'|'fail', findings: object[], deterministic: object[] }>, errors: string[] }}
 */
export function validateVerdicts({ items, verdicts, hashField, findingTypes, noun = '対象' }) {
  const errors = [];
  const byKey = new Map();
  for (const v of verdicts) {
    if (!v || typeof v.key !== 'string') {
      errors.push(`key の無い判定: ${JSON.stringify(v).slice(0, 80)}`);
      continue;
    }
    if (byKey.has(v.key)) errors.push(`${v.key}: 判定が 2 件ある`);
    byKey.set(v.key, v);
  }
  const valid = [];
  for (const item of items) {
    const v = byKey.get(item.key);
    byKey.delete(item.key);
    if (!v) {
      errors.push(`${item.key}: 判定が無い`);
      continue;
    }
    if (v[hashField] !== item[hashField]) {
      errors.push(`${item.key}: 判定の ${hashField} が作業票と違う（別の回の判定を混ぜていないか）`);
      continue;
    }
    if (v.verdict !== 'pass' && v.verdict !== 'fail') {
      errors.push(`${item.key}: verdict は pass か fail（${v.verdict}）`);
      continue;
    }
    const findings = Array.isArray(v.findings) ? v.findings : null;
    if (!findings) {
      errors.push(`${item.key}: findings が配列でない`);
      continue;
    }
    const bad = findings.find((f) => !['major', 'minor'].includes(f?.severity) || !findingTypes.includes(f?.type) || !String(f?.detail ?? '').trim());
    if (bad) {
      errors.push(`${item.key}: 指摘の形が違う（severity は major/minor・type は ${findingTypes.join('/')}・detail 必須）: ${JSON.stringify(bad).slice(0, 120)}`);
      continue;
    }
    const checked = Array.isArray(v.checkedShots) ? v.checkedShots : [];
    const unchecked = [...new Set(item.shots.map((s) => s.file))].filter((f) => !checked.includes(f));
    if (unchecked.length) {
      errors.push(`${item.key}: 見ていない撮影がある（checkedShots に無い: ${unchecked.join(', ')}）`);
      continue;
    }
    const hasMajor = findings.some((f) => f.severity === 'major');
    const deterministic = item.deterministicIssues ?? [];
    if (v.verdict === 'pass' && hasMajor) {
      errors.push(`${item.key}: major の指摘があるのに pass`);
      continue;
    }
    if (v.verdict === 'pass' && deterministic.length) {
      errors.push(`${item.key}: 描画の決定的な崩れ（${[...new Set(deterministic.map((d) => d.type))].join('・')}）があるのに pass`);
      continue;
    }
    if (v.verdict === 'fail' && !hasMajor && !deterministic.length) {
      errors.push(`${item.key}: fail なのに major の指摘も決定的な崩れも無い（minor だけなら pass）`);
      continue;
    }
    valid.push({ item, verdict: v.verdict, findings, deterministic });
  }
  for (const key of byKey.keys()) errors.push(`${key}: 作業票に無い${noun}の判定`);
  return { valid, errors };
}

/**
 * 判定の段。1 = 不合格のあと中身が変わった（直したかの確認）・2 = 合格のあと中身が変わった・3 = 未判定・null = 判定済みで中身が同じ。
 */
export function reviewTier(entry, hash, hashField) {
  if (!entry) return 3;
  if (entry[hashField] === hash) return null;
  return entry.verdict === 'fail' ? 1 : 2;
}

/**
 * 台帳と現在の対象から、被覆と未処理を数える。
 * @returns {{ total: number, current: number, changed: number, never: number, failsOpen: string[], failsTicketed: string[], lastRun: string|null, ageDays: number|null }}
 */
export function summarizeCoverage({ entries, runs, candidates, hashField, now = new Date() }) {
  let current = 0;
  let changed = 0;
  let never = 0;
  const failsOpen = [];
  const failsTicketed = [];
  for (const c of candidates) {
    const e = entries?.[c.key];
    if (!e) {
      never += 1;
      continue;
    }
    if (e[hashField] !== c[hashField]) {
      changed += 1;
      continue;
    }
    current += 1;
    if (e.verdict === 'fail') (e.ticket ? failsTicketed : failsOpen).push(c.key);
  }
  const lastRun = (runs ?? []).map((r) => r.at).sort().at(-1) ?? null;
  const ageDays = lastRun ? (now.getTime() - Date.parse(lastRun)) / 86_400_000 : null;
  return { total: candidates.length, current, changed, never, failsOpen, failsTicketed, lastRun, ageDays };
}
