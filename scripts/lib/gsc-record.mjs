/**
 * gsc-record.mjs — GSC の記録層（週次観測・coverage・改善候補）の断片の検査と、記録が書けたかの判定。純関数だけ（I/O なし）。
 * ---------------------------------------------------------------------------
 * 書き手: 土曜の Mac の weekly-review.sh がヘッドレスの Claude に .tmp/claude-out/gsc/ へ断片を書かせ、
 * scripts/apply-gsc-records.mjs がここで検査してから gsc-management.md へ追記する（DN-0849・旧 gsc-auto-review.yml の
 * 「Apply records and commit」「Verify」を移した）。Claude は .claude/ に書けないので、追記・commit はモデルに委ねない。
 * ---------------------------------------------------------------------------
 */

/** 断片の種類: 見出しの語と行数の上限（旧 gsc-auto-review.yml と同じ） */
export const FRAGMENTS = {
  weekly: { file: 'weekly-entry.md', kind: '週次', maxLines: 20 },
  coverage: { file: 'coverage-entry.md', kind: 'coverage', maxLines: 25 },
};

/**
 * 断片の検査（pure）。空・無しは missing、1 行目が見出しの規約に合わなければ bad（追記しない）、行数の超過は warn だけ。
 * @param {string | null} text
 * @param {{ kind: string, maxLines: number }} spec
 * @returns {{ status: 'missing' | 'bad' | 'ok', lines: number, warning: string | null, reason: string | null }}
 */
export function validateFragment(text, spec) {
  const body = String(text ?? '').replace(/\s+$/, '');
  if (!body) return { status: 'missing', lines: 0, warning: null, reason: null };
  const lines = body.split(/\r?\n/);
  const head = new RegExp(`^### \\d{4}-\\d{2}-\\d{2}（${spec.kind}・自動レビュー）$`);
  if (!head.test(lines[0])) return { status: 'bad', lines: lines.length, warning: null, reason: `1 行目が見出しの規約（### YYYY-MM-DD（${spec.kind}・自動レビュー））に合わない: ${lines[0].slice(0, 80)}` };
  return { status: 'ok', lines: lines.length, warning: lines.length > spec.maxLines ? `${lines.length} 行（上限 ${spec.maxLines} 行）` : null, reason: null };
}

/** 追記する本文（pure）。既存の末尾と 1 行空けて足し、末尾は改行 1 つにする（append-only・既存には触らない） */
export function appendEntry(log, fragment) {
  const base = String(log).replace(/\n*$/, '\n');
  return `${base}\n${String(fragment).replace(/\s+$/, '')}\n`;
}

/**
 * 記録が書けたかの判定（pure）。check-gsc-auto-review --json の gates を実行の前後で比べる。
 * 週次は前の時点で要った（GSC のデータが新しく、今週分がまだ無い）のに書かれていなければ失敗。
 * coverage は整合ゲート（history の未追記）で正当に止まりうるので注意だけ。
 * @param {{ gscDataStale: boolean, weeklyAlreadyLogged: boolean, monthlyAlreadyLogged: boolean }} before
 * @param {{ weeklyAlreadyLogged: boolean, monthlyAlreadyLogged: boolean }} after
 */
export function judgeRecord(before, after) {
  const problems = [];
  const warnings = [];
  const weeklyDue = !before.gscDataStale && !before.weeklyAlreadyLogged;
  if (weeklyDue && !after.weeklyAlreadyLogged) problems.push('週次の記録が必要だったのに gsc-management.md に追記されていない（Claude は終わったが仕事をしていない）');
  if (!before.monthlyAlreadyLogged && !after.monthlyAlreadyLogged) warnings.push('coverage の記録が未追記のまま（整合ゲートで止まった可能性）');
  if (before.gscDataStale) warnings.push('GSC のデータが古い（fetch-metrics の停止の疑い）ので週次の記録は求めていない');
  return { ok: problems.length === 0, weeklyDue, problems, warnings };
}

/** Claude を回す必要があるか（pure）。週次か coverage のどちらかが要るときだけ */
export function recordNeeded(gates) {
  return (!gates.gscDataStale && !gates.weeklyAlreadyLogged) || !gates.monthlyAlreadyLogged;
}
