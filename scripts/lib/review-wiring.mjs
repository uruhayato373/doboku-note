/**
 * review-wiring.mjs — 週次・月次レビューの配線（入力 → 判断 → 出力）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 正本 .claude/config/review-wiring.json の inputs と、スキル本文が実行するコマンドの一致を検査し、
 * 管理画面 戦略 ＞ レビュー に出す実行状況（レビュー記録）と出力（起票カード・実験・週次計画）を組み立てる。
 * 読み手: npm run check-review-wiring（CI）・tools/admin-app の /metrics/business。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pendingItems } from './growth-triage.mjs';
import { extractWeeklyHandoffItems, parseRouting } from './handoff-extraction.mjs';
import { records } from './business-direction.mjs';

export const CONFIG = '.claude/config/review-wiring.json';
export const EVIDENCE = ['reviewRecord', 'sections', 'triage', 'reportFile', 'routing', 'weeklyPlan', 'checks', 'none'];

/**
 * 点検の結果（npm run review-checks が回ごとに書く）の置き場と、レポートで振り分ける節。
 * 置き場は事業の記録と同じく追記だけ（check-business-direction が既存ファイルの変更・削除を止める）なので、
 * 取り直すたびに時刻付きのファイルを足し、回ごとに ranAt が最新のものを読む。
 */
export const CHECKS_DIR = '.claude/state/metrics/business';
export const checksFileName = (cadenceId, runKey, ranAt) => `checks-${cadenceId}-${runKey}-${ranAt.replace(/[:.]/g, '-')}.json`;
const CHECKS_SECTION_RE = /^##\s+点検と Issue\s*$/;

/** その回（runKey 省略時は全回）の点検の結果のうち ranAt が最新のもの。無ければ null。 */
export function latestChecks(root, cadenceId, runKey = null) {
  const dir = join(root, CHECKS_DIR);
  if (!existsSync(dir)) return null;
  const prefix = runKey ? `checks-${cadenceId}-${runKey}` : `checks-${cadenceId}-`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && (runKey ? f === `${prefix}.json` || f.startsWith(`${prefix}-`) : f.startsWith(prefix)))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .filter((r) => r.cadence === cadenceId && (!runKey || r.runKey === runKey))
    .sort((a, b) => String(b.ranAt).localeCompare(String(a.ranAt)))[0] ?? null;
}

/**
 * 点検の結果のうち振り分けが要るもの（失敗・検査不成立の点検と、開いている Issue）と、
 * レポートの「点検と Issue」節でそれぞれに行き先（振り分け: DN・定常・理由）があるか（純関数）。
 * 点検はコマンド名、Issue は #番号 を含む箇条書きで照合する。
 */
export function checksRouting(result, reportText) {
  const pending = [
    ...(result?.checks ?? []).filter((c) => c.state !== 'ok').map((c) => ({ key: c.command, label: `${c.label}（${c.state === 'broken' ? '検査不成立' : '要対応'}）` })),
    ...(result?.issues ?? []).map((i) => ({ key: `#${i.number}`, label: `#${i.number} ${i.title}` })),
    ...[...new Set((result?.alerts ?? []).map((a) => a.package))].map((p) => ({ key: `dependabot:${p}`, label: `依存の脆弱性 ${p}` })),
  ];
  const { hasSection, items } = extractWeeklyHandoffItems(reportText, CHECKS_SECTION_RE);
  const mentions = (key, text) => (key.startsWith('#') ? new RegExp(`${key}(?!\\d)`).test(text) : text.includes(key));
  const unrouted = pending.filter((p) => !items.some((it) => mentions(p.key, it.text) && parseRouting(it.text)));
  return { hasSection, pending, unrouted };
}

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
      if (p.evidence === 'checks' && !(c.checks ?? []).length) errors.push(`${cadence}: 手順「${p.label}」は cadences.${cadence}.checks が要る`);
    }
    for (const k of c.checks ?? []) {
      if (!(c.inputs ?? []).some((i) => i.command === k.command)) errors.push(`${cadence}: 点検 ${k.command} が inputs に無い`);
    }
  }
  return errors;
}

/** バックログのうち、起点にそのレビュー（「週次レビュー（開始〜終了）」等）を書いたカード。 */
export function cardsFromReview(backlogText, cadenceLabel, period) {
  const key = `${cadenceLabel}レビュー（${period.startDate}〜${period.endDate}）`;
  const cards = [];
  let current = null;
  for (const line of String(backlogText).split(/\r?\n/)) {
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
  const weeklyHead = existsSync(weeklyPath) ? readFileSync(weeklyPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('# ')) ?? null : null;

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
  for (const line of text.slice(at).split(/\r?\n/)) {
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
  for (const line of String(reportText).split(/\r?\n/)) {
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
/**
 * 手順ごとの実施の証拠。runKey（週次 YYYY-Www・月次 YYYY-MM）を渡すとその回のレビュー記録とレポートで判定する
 * （保持方針で消えた古いレポートは git 履歴から読む）。省略時は最新のレポートと最新の記録。
 * 週次の計測トリアージ・週間計画は「いま」の状態しか持たないので、最新より前の回では確かめない（manual）。
 * @param {string} root
 * @param {string} cadenceId
 * @param {{ reviews?: any[], runKey?: string | null }} [options]
 */
export function buildProcedureView(root, cadenceId, { reviews = [], runKey = null } = {}) {
  const config = JSON.parse(readFileSync(join(root, CONFIG), 'utf8'));
  const c = config.cadences[cadenceId];
  if (!c) return null;
  const skillText = existsSync(join(root, c.skill)) ? readFileSync(join(root, c.skill), 'utf8') : '';

  const reportDir = join(root, c.report?.dir ?? 'docs/reviews/weekly');
  const reportRe = new RegExp(c.report?.pattern ?? '^\\d{4}-W\\d{2}-review\\.md$');
  const latestReport = existsSync(reportDir) ? readdirSync(reportDir).filter((f) => reportRe.test(f)).sort().at(-1) ?? null : null;
  let reportName = latestReport;
  let reportText = reportName ? readFileSync(join(reportDir, reportName), 'utf8') : '';
  if (runKey) {
    const name = `${runKey}-review.md`;
    if (existsSync(join(reportDir, name))) {
      reportName = name;
      reportText = readFileSync(join(reportDir, name), 'utf8');
    } else {
      const archived = deletedReports(root, c.report?.dir ?? 'docs/reviews/weekly', reportRe);
      reportName = archived.has(name) ? name : null;
      reportText = reportName ? archived.get(name) : '';
    }
  }
  const latestKey = latestReport ? runKeyOfReport(latestReport) : null;
  const pastRun = Boolean(runKey && latestKey && runKey < latestKey);
  const week = reportName?.slice(0, 8) ?? null;
  const have = reportSections(reportText);
  const findSection = (want) => have.find((h) => sameSection(h.title, want));

  const record = runKey
    ? reviews.filter((r) => r.cadence === cadenceId && runKeyOfPeriod(cadenceId, r.period) === runKey)
      .sort((a, b) => String(b.createdAt ?? b.file).localeCompare(String(a.createdAt ?? a.file)))[0] ?? null
    : reviews.filter((r) => r.cadence === cadenceId).sort((a, b) => String(b.period.endDate).localeCompare(a.period.endDate))[0] ?? null;

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
      if (pastRun) return { state: 'manual', note: '前の回は確かめない（いまの状態しか残らない）' };
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
      const title = c.handoffSection ?? '来週への申し送り';
      const { hasSection, items } = extractWeeklyHandoffItems(reportText, c.handoffSection ? new RegExp(`^##\\s+${c.handoffSection}\\s*$`) : undefined);
      if (!hasSection) return { state: 'missing', note: `「${title}」の節が無い` };
      const routed = items.filter((it) => parseRouting(it.text)).length;
      return { state: routed === items.length ? 'ok' : 'partial', note: `申し送り ${items.length} 件中 行き先あり ${routed}` };
    },
    weeklyPlan: () => {
      if (pastRun) return { state: 'manual', note: '前の回は確かめない（いまの状態しか残らない）' };
      const path = join(root, '.claude/todo/weekly.md');
      const head = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/).find((l) => l.startsWith('# ')) ?? '' : '';
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
    checks: () => {
      const result = latestChecks(root, cadenceId, runKey);
      if (!result) return { state: 'missing', note: '点検の結果が無い（npm run review-checks）' };
      const { hasSection, pending, unrouted } = checksRouting(result, reportText);
      const ran = result.checks?.length ?? 0;
      const head = `点検 ${ran} 本・要対応 ${pending.length} 件（Issue ${result.issues?.length ?? 0}・依存の脆弱性 ${result.alerts?.length ?? 0}）`;
      if (result.issuesError || result.alertsError) return { state: 'partial', note: `${head}・${result.issuesError ? 'Issue' : '依存の脆弱性'}を読めなかった` };
      if (!pending.length) return { state: 'ok', note: head };
      if (!hasSection) return { state: 'missing', note: `${head}・「点検と Issue」の節が無い` };
      return {
        state: unrouted.length ? 'partial' : 'ok',
        note: unrouted.length ? `${head}・行き先なし ${unrouted.length}: ${unrouted.map((u) => u.key).join(' ')}` : `${head}・全件に行き先あり`,
      };
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

/** レポートのファイル名から、そのレポートが扱う回のキー（週次＝ISO 週 YYYY-Www・月次＝YYYY-MM）。 */
export function runKeyOfReport(name) {
  return /^(\d{4}-W\d{2})-review\.md$/.exec(name)?.[1] ?? /^(\d{4}-\d{2})-review\.md$/.exec(name)?.[1] ?? null;
}

/**
 * レビュー記録の期間から回のキー。週次は「前の完了週」を振り返るので、期間の翌日が属する ISO 週＝レポートの週
 * （例: 期間 09-14〜09-20 の記録は W39 のレポートの回）。月次のレポート名は対象月なので開始日の年月。
 */
export function runKeyOfPeriod(cadenceId, period) {
  if (cadenceId === 'monthly') return String(period.startDate).slice(0, 7);
  const next = new Date(Date.parse(`${period.endDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return isoWeekOf(next);
}


/**
 * 保持方針で削除された過去のレポート（週次・月次とも最新 1 本だけを残し、古い回は git 履歴が持つ）を git から読む。
 * 返り値は レポート名 → 本文。git が使えない環境では空（履歴は「レポートなし」で出る）。
 */
function deletedReports(root, dir, re) {
  const out = new Map();
  try {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
    const log = git(['log', '--diff-filter=D', '--name-only', '--format=@%H', '--', dir]);
    let commit = null;
    for (const line of log.split(/\r?\n/)) {
      if (line.startsWith('@')) { commit = line.slice(1); continue; }
      const name = line.trim().split('/').at(-1);
      if (!commit || !name || !re.test(name) || out.has(name)) continue;
      out.set(name, git(['show', `${commit}^:${dir}/${name}`]));
    }
  } catch {
    // git が無い・浅いクローンで親が無いなどは読めないだけ（履歴は「レポートなし」で出る）
  }
  return out;
}

/**
 * 回ごとの実施履歴（新しい順）。レビュー記録とレポートを回のキーで突き合わせ、
 * 「記録（確定/暫定）・レポート・必須の節・申し送りの振り分け（週次）・起票カード」を 1 行にする。
 * verdict は ok（記録が確定・レポートあり・必須の節が全部・振り分け済み）/ partial（どれか欠ける）/ missing（記録もレポートも無い）。
 * 保持方針で削除された古いレポートは git 履歴から読む（reportSource: 'git'）。
 * 最新の回だけに意味がある証拠（計測トリアージ・週間計画）は buildProcedureView が見るので、ここでは扱わない。
 */
/** @param {string} root @param {string} cadenceId @param {{ reviews?: any[], limit?: number }} [opts] reviews を省くと .claude/state/metrics/business の全記録（同じ期間の書き直しも数える） */
export function buildRunHistory(root, cadenceId, { reviews = records(root).filter((r) => r.kind === 'review'), limit = 12 } = {}) {
  const config = JSON.parse(readFileSync(join(root, CONFIG), 'utf8'));
  const c = config.cadences[cadenceId];
  if (!c) return [];
  const skillPath = join(root, c.skill);
  const expected = existsSync(skillPath) ? formatSections(readFileSync(skillPath, 'utf8')) : [];
  const backlogPath = join(root, '.claude/todo/backlog.md');
  const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '';
  const reportDir = join(root, c.report?.dir ?? 'docs/reviews/weekly');
  const reportRe = (c.report?.pattern ? new RegExp(c.report.pattern) : /^\d{4}-W\d{2}-review\.md$/);
  const reports = existsSync(reportDir) ? readdirSync(reportDir).filter((f) => reportRe.test(f)) : [];
  const archived = deletedReports(root, c.report?.dir ?? 'docs/reviews/weekly', reportRe);

  const runs = new Map();
  const runOf = (key) => {
    if (!runs.has(key)) runs.set(key, { key, records: [], report: null });
    return runs.get(key);
  };
  for (const r of reviews.filter((x) => x.cadence === cadenceId)) runOf(runKeyOfPeriod(cadenceId, r.period)).records.push(r);
  for (const name of archived.keys()) {
    const key = runKeyOfReport(name);
    if (key) Object.assign(runOf(key), { report: name, reportSource: 'git' });
  }
  for (const name of reports) {
    const key = runKeyOfReport(name);
    if (key) Object.assign(runOf(key), { report: name, reportSource: 'file' });
  }

  return [...runs.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, limit)
    .map(({ key, records, report, reportSource = null }) => {
      const latest = [...records].sort((a, b) => String(b.createdAt ?? b.file).localeCompare(String(a.createdAt ?? a.file)))[0] ?? null;
      const text = !report ? '' : reportSource === 'git' ? archived.get(report) : readFileSync(join(reportDir, report), 'utf8');
      const have = reportSections(text);
      const sections = report ? { found: expected.filter((e) => have.some((h) => sameSection(h.title, e))).length, expected: expected.length } : null;
      let routing = null;
      if (cadenceId === 'weekly' && report) {
        const { hasSection, items } = extractWeeklyHandoffItems(text);
        routing = hasSection ? { routed: items.filter((it) => parseRouting(it.text)).length, total: items.length } : { routed: 0, total: -1 };
      }
      const period = latest?.period ?? null;
      const cards = period ? cardsFromReview(backlog, c.label, period).length : 0;
      const recordOk = latest?.status && latest.status !== 'provisional';
      const sectionsOk = sections && sections.found === sections.expected;
      const routingOk = routing === null || (routing.total >= 0 && routing.routed === routing.total);
      const verdict = !latest && !report ? 'missing' : recordOk && report && sectionsOk && routingOk ? 'ok' : 'partial';
      return {
        key,
        period,
        record: latest ? { status: latest.status, revisions: records.length, decision: latest.decision ?? '', file: latest.file ?? null } : null,
        report,
        reportSource,
        sections,
        routing,
        cards,
        verdict,
      };
    });
}
