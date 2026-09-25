/**
 * qualification-registry.mjs — 資格一覧（qualification-registry.json）と試験日程・受験者統計の整合検査（純粋関数）
 * ---------------------------------------------------------------------------
 * 資格 id は qualification-registry.json が定義し、exam-calendar.json（日程）と exam-stats.json
 * （受験者数）が同じ id で持つ。三者の id が食い違うと、候補資格が片方の正本にだけ残ったり、
 * 展開中の資格の日程が無検査で素通りしたりする。scripts/check-exam-calendar.mjs から呼ぶ。
 * ---------------------------------------------------------------------------
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STAT_KEYS = ['applicants', 'examinees', 'passers', 'passRate'];

/** registry の portfolio=active の id。 */
export function activeIds(registry) {
  return registry.qualifications.filter((q) => q.portfolio === 'active').map((q) => q.id);
}

/** 統計の行（latest 本体 / stages の各行 / divisions の各行）の数値欄が数値か null であること。 */
function checkStatRow(where, row, errors) {
  for (const k of STAT_KEYS) {
    if (k in row && row[k] !== null && typeof row[k] !== 'number') errors.push(`${where}.${k} は数値か null`);
  }
}

/**
 * @param {{ registry: any, calendar: any, examStats: any, lineupConfig?: any, refExists?: (path: string) => boolean }} input
 * @returns {string[]} 違反メッセージ（空なら整合）
 */
export function validateQualificationRegistry({ registry, calendar, examStats, lineupConfig = null, refExists = null }) {
  const errors = [];
  const statuses = new Set(Object.keys(registry.portfolioStatuses ?? {}));
  const families = new Set(Object.keys(registry.families ?? {}));
  const ids = new Set();

  for (const q of registry.qualifications ?? []) {
    if (ids.has(q.id)) errors.push(`registry: id ${q.id} が重複`);
    ids.add(q.id);
    if (!statuses.has(q.portfolio)) errors.push(`registry.${q.id}: portfolio ${q.portfolio} は未定義`);
    if (!families.has(q.family)) errors.push(`registry.${q.id}: family ${q.family} は未定義`);
    if (q.portfolio === 'declined' && !q.decision?.ref) errors.push(`registry.${q.id}: declined は decision.ref（判断の文書）が必要`);
    if (q.decision?.ref && refExists && !refExists(q.decision.ref)) errors.push(`registry.${q.id}: decision.ref ${q.decision.ref} が実在しない`);
  }

  const calendarIds = new Set(Object.keys(calendar.exams ?? {}));
  const statsIds = new Set(Object.keys(examStats.exams ?? {}));
  for (const id of ids) {
    if (!calendarIds.has(id)) errors.push(`exam-calendar に registry の ${id} が無い`);
    if (!statsIds.has(id)) errors.push(`exam-stats に registry の ${id} が無い`);
  }
  for (const id of calendarIds) if (!ids.has(id)) errors.push(`exam-calendar の ${id} が registry に無い`);
  for (const id of statsIds) if (!ids.has(id)) errors.push(`exam-stats の ${id} が registry に無い`);

  // 日程: 確定日は ISO 日付、未発表は periods の文言。どちらも無い資格は「未確認」を note で明示する。
  const kinds = new Set(Object.keys(calendar.eventKinds ?? {}));
  for (const [id, exam] of Object.entries(calendar.exams ?? {})) {
    for (const [key, ev] of Object.entries(exam.events ?? {})) {
      if (typeof ev?.label !== 'string' || !ISO_DATE.test(ev?.date ?? '')) errors.push(`exam-calendar.${id}.events.${key} は label と YYYY-MM-DD の date が必要`);
      if (!kinds.has(ev?.kind)) errors.push(`exam-calendar.${id}.events.${key} の kind（${[...kinds].join('/')}）が必要`);
    }
    const hasSchedule = Object.keys(exam.events ?? {}).length + Object.keys(exam.periods ?? {}).length > 0;
    if (!hasSchedule && !exam.note) errors.push(`exam-calendar.${id}: 日程が無いなら note に理由が必要`);
  }

  // 統計: latest が null（公式未確認）なら note で理由を書く。数値欄は数値か null。
  for (const [id, exam] of Object.entries(examStats.exams ?? {})) {
    if (!('latest' in exam)) errors.push(`exam-stats.${id}: latest（無ければ null）が必要`);
    if (exam.latest === null && !exam.note) errors.push(`exam-stats.${id}: latest が null なら note に理由が必要`);
    if (exam.latest) {
      checkStatRow(`exam-stats.${id}.latest`, exam.latest, errors);
      for (const [k, row] of Object.entries(exam.latest.stages ?? {})) checkStatRow(`exam-stats.${id}.latest.stages.${k}`, row, errors);
      for (const [k, row] of Object.entries(exam.latest.divisions ?? {})) checkStatRow(`exam-stats.${id}.latest.divisions.${k}`, row, errors);
    }
  }

  // 商品ラインナップの行は展開中の資格そのもの。候補を載せない・展開中を落とさない。
  if (lineupConfig) {
    const active = new Set(activeIds(registry));
    const lineup = new Set(lineupConfig.qualifications.map((q) => q.id));
    for (const id of lineup) if (!active.has(id)) errors.push(`product-lineup の ${id} は registry で active ではない`);
    for (const id of active) if (!lineup.has(id)) errors.push(`registry の active ${id} が product-lineup に無い`);
  }
  return errors;
}
