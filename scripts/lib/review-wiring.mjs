/**
 * review-wiring.mjs — 週次・月次レビューの配線（入力 → 判断 → 出力）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 正本 .claude/config/review-wiring.json の inputs と、スキル本文が実行するコマンドの一致を検査し、
 * 管理画面 戦略 ＞ レビュー に出す実行状況（レビュー記録）と出力（起票カード・実験・週次計画）を組み立てる。
 * 読み手: npm run check-review-wiring（CI）・tools/admin-app の /metrics/business。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pendingItems } from './growth-triage.mjs';
import { extractWeeklyHandoffItems, parseRouting } from './handoff-extraction.mjs';

export const CONFIG = '.claude/config/review-wiring.json';
export const EVIDENCE = ['reviewRecord', 'sections', 'triage', 'reportFile', 'routing', 'weeklyPlan', 'none'];

/** スキル本文が実行するコマンド（npm run の名前はそのまま、node scripts/ 直の実行は「node:」＋スクリプト名）。重複なし・並びは出現順。 */
export function extractCommands(skillText) {
  const out = [];
  for (const m of String(skillText).matchAll(/npm run ([a-z0-9:_-]+)|node scripts\/([A-Za-z0-9_./-]+)\.mjs/g)) {
    const cmd = m[1] ?? `node:${m[2]}`;
    if (!out.includes(cmd)) out.push(cmd);
  }
  return out;
}

/** 正本とスキル本文の食い違い（純関数）。missing＝スキルにあるが正本に無い、extra＝正本にあるがスキルに無い。 */
export function diffWiring(inputs, skillText) {
  const inSkill = extractCommands(skillText);
  const inConfig = inputs.map((i) => i.command);
  return { missing: inSkill.filter((c) => !inConfig.includes(c)), extra: inConfig.filter((c) => !inSkill.includes(c)) };
}

/** 正本の形の検査（stage・role の語彙と重複）。 */
export function validateWiring(config) {
  const errors = [];
  for (const [cadence, c] of Object.entries(config.cadences ?? {})) {
    const seen = new Set();
    for (const i of c.inputs ?? []) {
      if (!config.stages.includes(i.stage)) errors.push(`${cadence}: ${i.command} の stage「${i.stage}」は stages に無い`);
      if (!['判断', '点検'].includes(i.role)) errors.push(`${cadence}: ${i.command} の role は 判断 か 点検`);
      if (seen.has(i.command)) errors.push(`${cadence}: ${i.command} が重複`);
      seen.add(i.command);
    }
    for (const p of c.procedure ?? []) {
      if (!EVIDENCE.includes(p.evidence)) errors.push(`${cadence}: 手順「${p.label}」の evidence「${p.evidence}」は ${EVIDENCE.join('/')} のどれか`);
      if (p.evidence === 'sections' && !(p.sections ?? []).length) errors.push(`${cadence}: 手順「${p.label}」は sections が要る`);
    }
  }
  return errors;
}

/** バックログのうち、起点にそのレビュー（「週次レビュー（開始〜終了）」等）を書いたカード。 */
export function cardsFromReview(backlogText, cadenceLabel, period) {
  const key = `${cadenceLabel}レビュー（${period.startDate}〜${period.endDate}）`;
  const cards = [];
  let current = null;
  for (const line of String(backlogText).split('\n')) {
    const m = /^### \[(DN-\d{4})\] (.+)$/.exec(line);
    if (m) current = { id: m[1], title: m[2] };
    else if (current && line.includes(key) && !cards.some((c) => c.id === current.id)) cards.push(current);
  }
  return cards;
}

/** 管理画面のレビュー画面の表示モデル。reviews は business-direction の review 記録（新しい順でなくてよい）。 */
/** @param {string} root @param {{ reviews?: any[], due?: any[] }} [opts] */
export function buildReviewView(root, { reviews = [], due = [] } = {}) {
  const config = JSON.parse(readFileSync(join(root, CONFIG), 'utf8'));
  const backlogPath = join(root, '.claude/todo/backlog.md');
  const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '';
  const weeklyPath = join(root, '.claude/todo/weekly.md');
  const weeklyHead = existsSync(weeklyPath) ? readFileSync(weeklyPath, 'utf8').split('\n').find((l) => l.startsWith('# ')) ?? null : null;

  return Object.entries(config.cadences).map(([id, c]) => {
    const skillPath = join(root, c.skill);
    const drift = existsSync(skillPath) ? diffWiring(c.inputs, readFileSync(skillPath, 'utf8')) : { missing: [], extra: [] };
    const mine = reviews.filter((r) => r.cadence === id).sort((a, b) => String(b.period.endDate).localeCompare(a.period.endDate));
    const latest = mine[0] ?? null;
    const byStage = config.stages.map((stage) => ({
      stage,
      judge: c.inputs.filter((i) => i.stage === stage && i.role === '判断'),
      check: c.inputs.filter((i) => i.stage === stage && i.role === '点検'),
    })).filter((s) => s.judge.length || s.check.length);
    return {
      id,
      label: c.label,
      outputs: c.outputs,
      byStage,
      counts: { judge: c.inputs.filter((i) => i.role === '判断').length, check: c.inputs.filter((i) => i.role === '点検').length },
      drift,
      due: due.find((d) => d.cadence === id) ?? null,
      latest,
      cards: latest ? cardsFromReview(backlog, c.label, latest.period) : [],
      weeklyPlan: id === 'weekly' ? weeklyHead : null,
      history: mine.slice(1, 6),
    };
  });
}

/** 日付（YYYY-MM-DD）の ISO 週（YYYY-Www）。 */
export function isoWeekOf(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear();
  const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

/** スキル本文「## 出力フォーマット」以降のフェンス内にある H2（レポートに必ず書く節）。 */
export function formatSections(skillText) {
  const text = String(skillText);
  const at = text.indexOf('## 出力フォーマット');
  if (at < 0) return [];
  const out = [];
  let inFence = false;
  for (const line of text.slice(at).split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    const m = inFence && /^## (.+)$/.exec(line);
    if (m && !out.includes(m[1].trim())) out.push(m[1].trim());
  }
  return out;
}

/** レポート本文の H2 と、節ごとの「欠測・未取得」の出現数。 */
export function reportSections(reportText) {
  const sections = [];
  let cur = null;
  let inFence = false;
  for (const line of String(reportText).split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const m = !inFence && /^## (.+)$/.exec(line);
    if (m) {
      cur = { title: m[1].trim(), lines: 0, gaps: 0 };
      sections.push(cur);
    } else if (cur && line.trim()) {
      cur.lines += 1;
      cur.gaps += (line.match(/欠測|未取得|未確認|取得失敗/g) ?? []).length;
    }
  }
  return sections;
}

/** 節名の照合（「計測ダイジェスト 2026-W38（…）」のような後ろ付きも同じ節とみなす）。 */
const sameSection = (have, want) => have === want || have.startsWith(`${want} `) || have.startsWith(`${want}（`);

/**
 * 手順の点検の表示モデル（純粋に近い: ファイルを読むだけで書かない）。
 * 各手順について ok（証拠あり）/ partial / missing / manual（証拠が残らない手順）と、その根拠の一文を返す。
 */
/** @param {string} root @param {string} cadenceId @param {{ reviews?: any[] }} [opts] */
export function buildProcedureView(root, cadenceId, { reviews = [] } = {}) {
  const config = JSON.parse(readFileSync(join(root, CONFIG), 'utf8'));
  const c = config.cadences[cadenceId];
  if (!c) return null;
  const skillText = existsSync(join(root, c.skill)) ? readFileSync(join(root, c.skill), 'utf8') : '';

  const reportDir = join(root, c.report?.dir ?? 'docs/reviews/weekly');
  const reportRe = new RegExp(c.report?.pattern ?? '^\\d{4}-W\\d{2}-review\\.md$');
  const reportName = existsSync(reportDir) ? readdirSync(reportDir).filter((f) => reportRe.test(f)).sort().at(-1) ?? null : null;
  const reportText = reportName ? readFileSync(join(reportDir, reportName), 'utf8') : '';
  const week = reportName?.slice(0, 8) ?? null;
  const have = reportSections(reportText);
  const findSection = (want) => have.find((h) => sameSection(h.title, want));

  const record = reviews.filter((r) => r.cadence === cadenceId).sort((a, b) => String(b.period.endDate).localeCompare(a.period.endDate))[0] ?? null;

  const evidence = {
    reviewRecord: () => (record
      ? { state: record.status === 'provisional' ? 'partial' : 'ok', note: `レビュー記録 ${record.period.startDate}〜${record.period.endDate}（${record.status === 'provisional' ? '欠測ありの暫定' : '確定'}）` }
      : { state: 'missing', note: 'レビュー記録が無い' }),
    sections: (p) => {
      if (!reportName) return { state: 'missing', note: 'レポートが無い' };
      const found = p.sections.filter((s) => findSection(s));
      const lacking = p.sections.filter((s) => !findSection(s));
      const gaps = found.reduce((n, s) => n + findSection(s).gaps, 0);
      return {
        state: lacking.length ? (found.length ? 'partial' : 'missing') : 'ok',
        note: `節 ${found.length}/${p.sections.length}${lacking.length ? `（無い: ${lacking.join('・')}）` : ''}${gaps ? `・欠測の記載 ${gaps}` : ''}`,
      };
    },
    triage: () => {
      const dir = join(root, '.claude/state/metrics/growth');
      const digestName = existsSync(dir) ? readdirSync(dir).filter((f) => /^digest-\d{4}-W\d{2}\.json$/.test(f)).sort().at(-1) : null;
      if (!digestName) return { state: 'missing', note: '計測ダイジェストが無い' };
      const digest = JSON.parse(readFileSync(join(dir, digestName), 'utf8'));
      const logPath = join(dir, 'triage-log.json');
      const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { entries: [] };
      const pending = pendingItems(digest, log).length;
      const total = digest.surfaced.length;
      return { state: pending ? 'partial' : 'ok', note: `${digest.week} の候補 ${total} 件中 処分済み ${total - pending}${pending ? `・未処分 ${pending}` : ''}` };
    },
    reportFile: () => (reportName
      ? { state: 'ok', note: `${reportName}（${have.length} 節）` }
      : { state: 'missing', note: `${c.report?.dir ?? 'docs/reviews/weekly'} にレポートが無い` }),
    routing: () => {
      const { hasSection, items } = extractWeeklyHandoffItems(reportText);
      if (!hasSection) return { state: 'missing', note: '「来週への申し送り」の節が無い' };
      const routed = items.filter((it) => parseRouting(it.text)).length;
      return { state: routed === items.length ? 'ok' : 'partial', note: `申し送り ${items.length} 件中 行き先あり ${routed}` };
    },
    weeklyPlan: () => {
      const path = join(root, '.claude/todo/weekly.md');
      const head = existsSync(path) ? readFileSync(path, 'utf8').split('\n').find((l) => l.startsWith('# ')) ?? '' : '';
      const plan = /(\d{4})-W(\d{2})（(\d{2})\/(\d{2})〜/.exec(head);
      if (!plan) return { state: 'missing', note: '週間計画が無い（見出しに週と期間が無い）' };
      const planStart = `${plan[1]}-${plan[3]}-${plan[4]}`;
      const labelWeek = `${plan[1]}-W${plan[2]}`;
      const isoWeek = isoWeekOf(planStart);
      const end = /対象期間:\s*\S+\s*〜\s*(\d{4}-\d{2}-\d{2})/.exec(reportText)?.[1];
      const expectStart = end ? new Date(Date.parse(`${end}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : null;
      const notes = [`週間計画 ${planStart.slice(5).replace('-', '/')}〜`];
      if (labelWeek !== isoWeek) notes.push(`見出しの週番号 ${labelWeek} は ISO では ${isoWeek}`);
      if (expectStart && planStart !== expectStart) notes.push(`レポートの翌週は ${expectStart.slice(5).replace('-', '/')}〜`);
      return { state: expectStart && planStart === expectStart && labelWeek === isoWeek ? 'ok' : 'partial', note: notes.join('・') };
    },
    none: () => ({ state: 'manual', note: '機械で確かめられる証拠が残らない' }),
  };

  const expected = formatSections(skillText);
  return {
    label: c.label,
    report: reportName ? { name: reportName, week } : null,
    steps: (c.procedure ?? []).map((p) => ({ label: p.label, does: p.does, ...evidence[p.evidence](p) })),
    sections: expected.length
      ? {
          expected: expected.map((title) => {
            const h = findSection(title);
            return { title, present: Boolean(h), lines: h?.lines ?? 0, gaps: h?.gaps ?? 0 };
          }),
          extra: have.filter((h) => !expected.some((e) => sameSection(h.title, e))).map((h) => h.title),
        }
      : null,
  };
}
