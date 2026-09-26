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

const CHECKED_BY = new Set(['self', 'agent']);
const VERIFICATION_LISTS = ['unresolved', 'pending', 'notPublished'];

/**
 * 照合記録（verification）の形を検査する。checkedBy: self=主担当が公式原文を読んで照合 /
 * agent=調査担当の読み取りだけ（未照合）。unresolved=こちらが確認できていない（要作業）/
 * pending=公式が未発表（発表待ち）/ notPublished=公式が公表していない。
 * 展開中の資格は本文・商品に数値を載せるので self を必須にする（2026-09-26: 調査担当の引用が
 * 原文でなく曜日まで食い違っていた・倍率を合格率欄に入れていた実例）。
 */
function checkVerification(where, v, isActive, errors) {
  if (!v) {
    errors.push(`${where}: verification（照合記録）が必要`);
    return;
  }
  if (!ISO_DATE.test(v.checkedAt ?? '')) errors.push(`${where}.verification.checkedAt は YYYY-MM-DD`);
  if (!CHECKED_BY.has(v.checkedBy)) errors.push(`${where}.verification.checkedBy は self か agent`);
  if (isActive && v.checkedBy !== 'self') errors.push(`${where}: 展開中の資格は主担当の原文照合（checkedBy: self）が必要`);
  for (const k of VERIFICATION_LISTS) {
    if (!Array.isArray(v[k]) || v[k].some((x) => typeof x !== 'string' || !x)) errors.push(`${where}.verification.${k} は文字列の配列`);
  }
}

/**
 * 合格率が合格者数÷受験者数（小数1位）と一致すること。倍率や別段階の率を合格率欄に入れる誤り
 * （2026-09-26: 公務員試験の倍率 2.5 を passRate に入れた）と、数値の写し間違いを止める。
 */
function checkRates(where, node, errors) {
  if (Array.isArray(node)) {
    node.forEach((x, i) => checkRates(`${where}[${i}]`, x, errors));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const { examinees, passers, passRate } = node;
  if (typeof passRate === 'number' && (passRate < 0 || passRate > 100)) errors.push(`${where}.passRate ${passRate} は 0〜100 の合格率ではない（倍率は competitionRatio へ）`);
  if (typeof examinees === 'number' && typeof passers === 'number' && typeof passRate === 'number' && examinees > 0) {
    const calc = Math.round((passers / examinees) * 1000) / 10;
    if (Math.abs(calc - passRate) > 0.1) errors.push(`${where}.passRate ${passRate} が合格者÷受験者 ${calc} と一致しない`);
  }
  for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') checkRates(`${where}.${k}`, v, errors);
}

const KIND_BY_LABEL = [
  { re: /発表|通知|公告/, kind: 'result' },
  { re: /申込|受付|申請|募集/, kind: 'application' },
];

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
  const active = new Set(activeIds(registry));
  const kinds = new Set(Object.keys(calendar.eventKinds ?? {}));
  for (const [id, exam] of Object.entries(calendar.exams ?? {})) {
    for (const [key, ev] of Object.entries(exam.events ?? {})) {
      if (typeof ev?.label !== 'string' || !ISO_DATE.test(ev?.date ?? '')) errors.push(`exam-calendar.${id}.events.${key} は label と YYYY-MM-DD の date が必要`);
      if (!kinds.has(ev?.kind)) errors.push(`exam-calendar.${id}.events.${key} の kind（${[...kinds].join('/')}）が必要`);
      const expect = KIND_BY_LABEL.find((r) => r.re.test(ev?.label ?? ''))?.kind;
      if (expect && ev?.kind && ev.kind !== expect) errors.push(`exam-calendar.${id}.events.${key}: 「${ev.label}」の kind は ${expect}（${ev.kind} になっている）`);
    }
    checkVerification(`exam-calendar.${id}`, exam.verification, active.has(id), errors);
    const hasSchedule = Object.keys(exam.events ?? {}).length + Object.keys(exam.periods ?? {}).length > 0;
    if (!hasSchedule && !exam.note) errors.push(`exam-calendar.${id}: 日程が無いなら note に理由が必要`);
  }

  // 統計: latest が null（公式未確認）なら note で理由を書く。数値欄は数値か null。
  checkRates('exam-stats', examStats, errors);
  for (const [id, exam] of Object.entries(examStats.exams ?? {})) {
    checkVerification(`exam-stats.${id}`, exam.verification, active.has(id), errors);
    // 部門別表（peSecondaryDivisions.<部門>）を参照する資格は、同じ年度・段階の値が表と一致すること
    if (exam.divisionRef && exam.latest) {
      const [table, name] = exam.divisionRef.split('.');
      const year = examStats[table]?.[exam.latest.year];
      const row = year?.divisions?.[name];
      if (!row) errors.push(`exam-stats.${id}: divisionRef ${exam.divisionRef} の ${exam.latest.year} 行が無い`);
      else if (year.stage === exam.latest.stage) {
        for (const k of STAT_KEYS) {
          if (row[k] !== exam.latest[k]) errors.push(`exam-stats.${id}.latest.${k} ${exam.latest[k]} が部門別表 ${row[k]} と一致しない`);
        }
      }
    }
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
    const lineup = new Set(lineupConfig.qualifications.map((q) => q.id));
    for (const id of lineup) if (!active.has(id)) errors.push(`product-lineup の ${id} は registry で active ではない`);
    for (const id of active) if (!lineup.has(id)) errors.push(`registry の active ${id} が product-lineup に無い`);
  }
  return errors;
}

/** 'YYYY-MM-DD' の日数差（to − from）。 */
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 日本の年度（4月始まり）。 */
function fiscalYearOf(date) {
  const [y, m] = date.split('-').map(Number);
  return m >= 4 ? y : y - 1;
}

export const STALE_DAYS = 180;

/**
 * 正本（日程・統計）の照合状態を資格ごとにまとめる。月次レビュー（npm run exam-ssot-status）と
 * 管理画面「資格一覧」が読む唯一の実装。actions は要対応、pending・notPublished は記録だけ。
 * @param {{ registry: any, calendar: any, examStats: any, today: string }} input today は JST の YYYY-MM-DD
 */
export function summarizeSsotStatus({ registry, calendar, examStats, today }) {
  const currentFy = fiscalYearOf(today);
  const rows = registry.qualifications.map((q) => {
    const cal = calendar.exams?.[q.id] ?? {};
    const st = examStats.exams?.[q.id] ?? {};
    const actions = [];
    const part = (label, v) => {
      if (!v) return null;
      const ageDays = daysBetween(v.checkedAt, today);
      for (const x of v.unresolved ?? []) actions.push(`${label}の未確認: ${x}`);
      if (v.checkedBy !== 'self') actions.push(`${label}: 主担当の原文照合が未了（調査担当の読み取りのみ）`);
      if (ageDays > STALE_DAYS) actions.push(`${label}: 最終照合から ${ageDays} 日（${STALE_DAYS} 日超）`);
      return { checkedAt: v.checkedAt, ageDays, checkedBy: v.checkedBy, unresolved: v.unresolved ?? [], pending: v.pending ?? [], notPublished: v.notPublished ?? [] };
    };
    const calendarStatus = part('日程', cal.verification);
    const statsStatus = part('統計', st.verification);
    const dates = Object.values(cal.events ?? {}).map((e) => e.date).sort();
    const upcoming = dates.filter((d) => d >= today);
    const schedulePast = dates.length > 0 && upcoming.length === 0 && Object.keys(cal.periods ?? {}).length === 0;
    if (q.portfolio === 'active' && schedulePast) actions.push('日程: 今年度の日程が終了（次年度の公式発表を確認して exam-calendar を更新）');
    const latestFy = st.latest?.fiscalYear ?? null;
    if (q.portfolio === 'active' && latestFy !== null && latestFy < currentFy - 1) actions.push(`統計: 最新が ${latestFy} 年度（${currentFy - 1} 年度の公表を確認）`);
    return {
      id: q.id,
      label: q.label,
      portfolio: q.portfolio,
      calendar: calendarStatus,
      stats: statsStatus,
      nextDate: upcoming[0] ?? null,
      schedulePast,
      latestFiscalYear: latestFy,
      actions,
    };
  });
  return {
    today,
    staleDays: STALE_DAYS,
    total: rows.length,
    actionCount: rows.reduce((n, r) => n + r.actions.length, 0),
    rows,
  };
}
