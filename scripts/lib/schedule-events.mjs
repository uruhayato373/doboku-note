/**
 * schedule-events.mjs — スケジュール集約アダプタ（読み取り専用）
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   バックログに配信表が prose 化したカードが多数あり、日付データは 7 系統・15+ スキーマに
 *   散在している。YouTube 予約が 68 日停止・187 件超過に誰も気づかなかった（DN-0131）のは
 *   横断で見る場所が無いため。
 *
 * 何をするか / しないか:
 *   各ソースを共通の ScheduleEvent 形へ**読み取り専用で写像する**だけ。スキーマ統一はせず、
 *   日付の真実源を新たに増やさない（各ソースの原本がそのまま真実源であり続ける）。
 *   書き込み・カレンダー操作・予約変更はここに一切実装しない。
 *
 * 読むソース（6 系統・sourceId。実際の読み取りは collectScheduleEvents が行う）:
 *   - exam-calendar   … .claude/config/exam-calendar.json（試験日）
 *   - x-campaign      … .claude/config/x-campaigns/*.json（X 計画枠）
 *   - x-status        … content/sns/x/draft/*\/status.json（X 実予約・実投稿）
 *   - ig-status       … content/sns/instagram/**\/status.json（IG 実予約・実投稿）
 *   - youtube-schedule… .claude/state/youtube-schedule.json（YouTube 予約）
 *   - backlog         … .claude/todo/backlog.md の `[期日:]`（タスク期日）
 *
 * 不採用ソース（触らない・読み込まない。理由を明記する）:
 *   - content/sns/schedule.json … 2026-05 世代の古い計画・実績系。ig-status/x-status と
 *     重複しており、真実源が二重化する。sns-board.ts（/sns タブ）が引き続き読む。
 *   - .github/workflows の cron 定義 … 「いつ実行されるか」であって「いつ何が公開されるか」の
 *     予定表ではない。集約対象のドメインが異なる。
 *
 * パーサ二重実装禁止（CLAUDE.md「全体の制約」）: backlog のパースは
 * scripts/lib/backlog-lib.mjs の parseBacklog を呼ぶ。ここでは taskDue の写像だけ行う。
 *
 * 検査ゼロを PASS と呼ばない（§9）: 各ソースは独立の try/catch で読み、失敗したソースは
 * `SourceReport.ok = false` + errors で報告する（0 件と「読めていない」を混同しない）。
 *
 * 本ファイルの mapper 群・表示補助は fs I/O を一切行わない純関数（テスト容易性）。
 * fs を伴う読み取りは末尾の collectScheduleEvents 系（read*）に閉じ込める。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { jstDayTime, todayJst } from './jst-date.mjs';
import { parseBacklog } from './backlog-lib.mjs';

/**
 * @typedef {Object} ScheduleEvent
 * @property {string} id            `${sourceId}:${ref}` 一意
 * @property {string} date          'YYYY-MM-DD' JST
 * @property {string|null} time     'HH:MM' JST
 * @property {'exam'|'x'|'instagram'|'youtube'|'todo'} channel
 * @property {'exam'|'post'|'plan-slot'|'todo-due'} kind
 * @property {'planned'|'reserved'|'posted'|'overdue'} status
 * @property {string} label
 * @property {string|null} detail
 * @property {'exam-calendar'|'x-campaign'|'x-status'|'ig-status'|'youtube-schedule'|'backlog'} sourceId
 * @property {string} sourcePath    repo 相対パス
 * @property {string} ref
 */

/**
 * @typedef {Object} SourceReport
 * @property {string} id
 * @property {string} label
 * @property {string} path
 * @property {boolean} ok
 * @property {number} count
 * @property {number} dateless
 * @property {number} legacy
 * @property {Array<{path: string, message: string}>} errors
 */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** date+time（JST）を辞書順比較できるキーへ。time が無ければ日の始まり(00:00)として扱う。 */
function keyOf(date, time) {
  return `${date}T${time ?? '00:00'}`;
}

/** date+time（JST）が nowMs 時点より過去か（同時刻は過去扱いにしない＝backlog の due 判定と同じ向き）。 */
function isPastJst(date, time, nowMs) {
  const now = jstDayTime(new Date(nowMs).toISOString());
  return keyOf(date, time) < keyOf(now.date, now.time);
}

/** errors 配列を先頭 cap 件に切り詰め、超過分は総数を1行にまとめる（黙って捨てない）。 */
function capErrors(errors, cap = 5) {
  if (errors.length <= cap) return errors;
  return [...errors.slice(0, cap), { path: '', message: `他 ${errors.length - cap} 件省略（総数 ${errors.length}）` }];
}

// ─── mapper 群（純関数・fs 禁止・現在時刻は nowMs 引数で注入） ─────────────────

/**
 * exam-calendar.json → ScheduleEvent[]。
 * 過去日でも overdue にしない（試験日は「予定が守られたか」を判定する対象ではないアンカー）。
 * @returns {{events: ScheduleEvent[], skipped: number}}
 */
export function mapExamCalendar(json, relPath) {
  const events = [];
  let skipped = 0;
  for (const [examId, exam] of Object.entries(json?.exams ?? {})) {
    for (const [eventId, ev] of Object.entries(exam?.events ?? {})) {
      if (typeof ev?.date !== 'string' || !YMD_RE.test(ev.date)) {
        skipped += 1;
        continue;
      }
      const ref = `${examId}/${eventId}`;
      events.push({
        id: `exam-calendar:${ref}`,
        date: ev.date,
        time: null,
        channel: 'exam',
        kind: 'exam',
        status: 'planned',
        label: `${exam.label ?? examId} ${ev.label ?? eventId}`,
        detail: null,
        sourceId: 'exam-calendar',
        sourcePath: relPath,
        ref,
      });
    }
  }
  return { events, skipped };
}

/**
 * x-campaigns/*.json の posts[] → ScheduleEvent[]（'plan-slot'）。
 * status は仮に 'planned' を入れる。実予約との消し込みは reconcileXPlan が行う。
 * @returns {ScheduleEvent[]}
 */
export function mapXCampaign(json, relPath) {
  const posts = Array.isArray(json?.posts) ? json.posts : [];
  return posts.map((post, index) => {
    const ref = `${relPath}#${index}`;
    const label = `${post.slot ?? ''} ${post.exam ?? ''}/${post.type ?? ''}/${post.funnel ?? ''}`.trim();
    return {
      id: `x-campaign:${ref}`,
      date: post.date,
      time: post.time ?? null,
      channel: 'x',
      kind: 'plan-slot',
      status: 'planned',
      label,
      detail: null,
      sourceId: 'x-campaign',
      sourcePath: relPath,
      ref,
    };
  });
}

/**
 * x/draft/<name>/status.json の tweets{} → ScheduleEvent[]（実予約・実投稿）。
 * @returns {{events: ScheduleEvent[], dateless: number}}
 */
export function mapXDraftStatus(draftName, json, relPath, nowMs) {
  const events = [];
  let dateless = 0;
  for (const [tweetNo, t] of Object.entries(json?.tweets ?? {})) {
    const ref = `${draftName}#${tweetNo}`;
    const label = t?.title || ref;
    if (t?.posted_at) {
      const dt = jstDayTime(t.posted_at);
      if (!dt) { dateless += 1; continue; }
      events.push({
        id: `x-status:${ref}`,
        date: dt.date,
        time: dt.time,
        channel: 'x',
        kind: 'post',
        status: 'posted',
        label,
        detail: null,
        sourceId: 'x-status',
        sourcePath: relPath,
        ref,
      });
      continue;
    }
    if (t?.scheduled_at) {
      const dt = jstDayTime(t.scheduled_at);
      if (!dt) { dateless += 1; continue; }
      events.push({
        id: `x-status:${ref}`,
        date: dt.date,
        time: dt.time,
        channel: 'x',
        kind: 'post',
        status: isPastJst(dt.date, dt.time, nowMs) ? 'overdue' : 'reserved',
        label,
        detail: null,
        sourceId: 'x-status',
        sourcePath: relPath,
        ref,
      });
      continue;
    }
    dateless += 1;
  }
  return { events, dateless };
}

/** IG status.json が持ちうるフォーマットキー。'reels'（複数形）は fail-safe 旧形式にのみ残る。 */
const IG_FORMAT_KEYS = ['carousel', 'reel', 'reels', 'stories'];

/**
 * instagram/**\/status.json → ScheduleEvent[]（実予約・実投稿）。
 * 値が object のキーのみ有効。文字列値（fail-safe 等の旧形式）は legacy カウントで除外する。
 * @returns {{events: ScheduleEvent[], dateless: number, legacy: number}}
 */
export function mapIgStatus(packRel, json, nowMs) {
  const events = [];
  let dateless = 0;
  let legacy = 0;
  const packLabel = basename(packRel);
  for (const formatKey of IG_FORMAT_KEYS) {
    const value = json?.[formatKey];
    if (value === undefined) continue;
    if (typeof value === 'string') { legacy += 1; continue; }
    if (typeof value !== 'object' || value === null) continue;
    const ref = `${packRel}#${formatKey}`;
    const label = `${packLabel} (${formatKey})`;
    if (value.posted_at) {
      const dt = jstDayTime(value.posted_at);
      if (!dt) { dateless += 1; continue; }
      events.push({
        id: `ig-status:${ref}`,
        date: dt.date,
        time: dt.time,
        channel: 'instagram',
        kind: 'post',
        status: 'posted',
        label,
        detail: null,
        sourceId: 'ig-status',
        sourcePath: `content/sns/instagram/${packRel}/status.json`,
        ref,
      });
      continue;
    }
    if (value.scheduled_at) {
      const dt = jstDayTime(value.scheduled_at);
      if (!dt) { dateless += 1; continue; }
      events.push({
        id: `ig-status:${ref}`,
        date: dt.date,
        time: dt.time,
        channel: 'instagram',
        kind: 'post',
        status: isPastJst(dt.date, dt.time, nowMs) ? 'overdue' : 'reserved',
        label,
        detail: null,
        sourceId: 'ig-status',
        sourcePath: `content/sns/instagram/${packRel}/status.json`,
        ref,
      });
      continue;
    }
    dateless += 1;
  }
  return { events, dateless, legacy };
}

/**
 * youtube-schedule.json の items[] → ScheduleEvent[]。
 * publishAt 過去は一律 overdue（uploaded でも公開検証フィールドが無い以上 posted と呼ばない・§9）。
 * @returns {{events: ScheduleEvent[], skipped: number}}
 */
export function mapYoutubeSchedule(json, relPath, nowMs) {
  const items = Array.isArray(json?.items) ? json.items : [];
  const events = [];
  let skipped = 0;
  for (const item of items) {
    const dt = jstDayTime(item?.publishAt);
    if (!dt) { skipped += 1; continue; }
    const ref = item.key ?? `${dt.date}-${dt.time}`;
    const past = isPastJst(dt.date, dt.time, nowMs);
    const status = past ? 'overdue' : item.status === 'uploaded' ? 'reserved' : 'planned';
    events.push({
      id: `youtube-schedule:${ref}`,
      date: dt.date,
      time: dt.time,
      channel: 'youtube',
      kind: 'post',
      status,
      detail: past ? '公開予約時刻を経過・公開実体は未検証（DN-0131）' : null,
      label: item.title ?? ref,
      sourceId: 'youtube-schedule',
      sourcePath: relPath,
      ref,
    });
  }
  return { events, skipped };
}

/**
 * backlog カード（parseBacklog の出力）のうち due を持つものだけ → ScheduleEvent[]。
 * 日付比較は 'YYYY-MM-DD' の文字列比較で可（同形式）。
 * @returns {ScheduleEvent[]}
 */
export function mapBacklogDue(cards, todayKey) {
  return cards
    .filter((c) => c.due)
    .map((c) => ({
      id: `backlog:${c.id ?? c.line}`,
      date: c.due,
      time: null,
      channel: 'todo',
      kind: 'todo-due',
      status: c.due < todayKey ? 'overdue' : 'planned',
      label: `${c.id ?? ''} ${c.title}`.trim(),
      detail: null,
      sourceId: 'backlog',
      sourcePath: '.claude/todo/backlog.md',
      ref: c.id ?? String(c.line),
    }));
}

/**
 * x-campaign の計画枠と x-status の実イベントを日単位で消し込む。
 * 計画07:15↔実予約07:50 のように時刻がずれるため時刻突合はできない。
 * 日付ごとに、その日の X 実イベント数だけ計画枠を時刻昇順に取り除き、残った枠だけを返す。
 * @param {ScheduleEvent[]} planSlots x-campaign 由来（channel:'x', kind:'plan-slot'）
 * @param {ScheduleEvent[]} xActualEvents x-status 由来（channel:'x', kind:'post'）
 * @param {string} todayKey 'YYYY-MM-DD'
 * @returns {ScheduleEvent[]}
 */
export function reconcileXPlan(planSlots, xActualEvents, todayKey) {
  const actualCountByDay = new Map();
  for (const ev of xActualEvents) {
    actualCountByDay.set(ev.date, (actualCountByDay.get(ev.date) ?? 0) + 1);
  }
  const byDay = new Map();
  for (const slot of planSlots) {
    if (!byDay.has(slot.date)) byDay.set(slot.date, []);
    byDay.get(slot.date).push(slot);
  }
  const remaining = [];
  for (const [date, slots] of byDay) {
    const sorted = [...slots].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    const consumed = actualCountByDay.get(date) ?? 0;
    const left = sorted.slice(consumed);
    for (const slot of left) {
      remaining.push({ ...slot, status: date < todayKey ? 'overdue' : 'planned' });
    }
  }
  return remaining;
}

// ─── 表示補助 ──────────────────────────────────────────────────────────────

/**
 * 月グリッド（月曜始まり・最大6行）。空セルは null。
 * @param {string} monthKey 'YYYY-MM'
 * @returns {(string|null)[][]}
 */
export function buildMonthMatrix(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const w = first.getUTCDay(); // 0=日 .. 6=土
  const leadPad = (w + 6) % 7; // 月曜=0 始まりへ変換
  const cells = [];
  for (let i = 0; i < leadPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(`${monthKey}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** 日付キーごとにグループ化し、日内は time 昇順（null は末尾）にソートする。 */
export function groupByDay(events) {
  const map = new Map();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.time === b.time) return 0;
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      return a.time.localeCompare(b.time);
    });
  }
  return map;
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 'YYYY-MM-DD' の曜日（日本語1文字）。ホストのローカルタイムゾーンに依存しないよう
 * Date.UTC 経由で計算する（buildMonthMatrix と同じ手法）。CLI・admin 双方の日付見出しで使う。
 */
export function weekdayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAY_JA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** channel × status の件数集計。 */
export function summarize(events) {
  const out = {};
  for (const ev of events) {
    if (!out[ev.channel]) out[ev.channel] = {};
    out[ev.channel][ev.status] = (out[ev.channel][ev.status] ?? 0) + 1;
  }
  return out;
}

// ─── I/O 集約 ──────────────────────────────────────────────────────────────

function readJsonFile(abs) {
  return JSON.parse(readFileSync(abs, 'utf8'));
}

function readExamCalendar(rootDir) {
  const relPath = '.claude/config/exam-calendar.json';
  try {
    const json = readJsonFile(join(rootDir, relPath));
    const { events, skipped } = mapExamCalendar(json, relPath);
    const errors = skipped > 0
      ? [{ path: relPath, message: `${skipped} 件の event が不正な日付形式でスキップ` }]
      : [];
    return {
      events,
      report: { id: 'exam-calendar', label: 'exam', path: relPath, ok: true, count: events.length, dateless: 0, legacy: 0, errors },
    };
  } catch (err) {
    return {
      events: [],
      report: { id: 'exam-calendar', label: 'exam', path: relPath, ok: false, count: 0, dateless: 0, legacy: 0, errors: [{ path: relPath, message: String(err?.message ?? err) }] },
    };
  }
}

function readXCampaigns(rootDir) {
  const dirRel = '.claude/config/x-campaigns';
  const dirAbs = join(rootDir, dirRel);
  const events = [];
  const errors = [];
  let ok = true;
  try {
    const files = readdirSync(dirAbs).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
      const relPath = `${dirRel}/${f}`;
      try {
        const json = readJsonFile(join(dirAbs, f));
        events.push(...mapXCampaign(json, relPath));
      } catch (err) {
        errors.push({ path: relPath, message: String(err?.message ?? err) });
      }
    }
  } catch (err) {
    ok = false;
    errors.push({ path: dirRel, message: String(err?.message ?? err) });
  }
  return {
    events,
    report: { id: 'x-campaign', label: 'x-campaign', path: dirRel, ok, count: events.length, dateless: 0, legacy: 0, errors: capErrors(errors) },
  };
}

function readXStatus(rootDir, nowMs) {
  const dirRel = 'content/sns/x/draft';
  const dirAbs = join(rootDir, dirRel);
  const events = [];
  const errors = [];
  let dateless = 0;
  let ok = true;
  try {
    // draft 直下1階層のみ（*/status.json）。_archive-old-account/ は旧凍結アカウントの
    // アーカイブで、status.json がさらに1階層下にあるため自然に対象外になる（意図的）。
    const entries = readdirSync(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const statusAbs = join(dirAbs, entry.name, 'status.json');
      if (!existsSync(statusAbs)) continue;
      const relPath = `${dirRel}/${entry.name}/status.json`;
      try {
        const json = readJsonFile(statusAbs);
        const mapped = mapXDraftStatus(entry.name, json, relPath, nowMs);
        events.push(...mapped.events);
        dateless += mapped.dateless;
      } catch (err) {
        errors.push({ path: relPath, message: String(err?.message ?? err) });
      }
    }
  } catch (err) {
    ok = false;
    errors.push({ path: dirRel, message: String(err?.message ?? err) });
  }
  return {
    events,
    report: { id: 'x-status', label: 'x-status', path: dirRel, ok, count: events.length, dateless, legacy: 0, errors: capErrors(errors) },
  };
}

function readIgStatus(rootDir, nowMs) {
  const dirRel = 'content/sns/instagram';
  const dirAbs = join(rootDir, dirRel);
  const events = [];
  const errors = [];
  let dateless = 0;
  let legacy = 0;
  let ok = true;
  try {
    // globSync は Node 22+ のため使わない（本リポジトリは Node 20）。readdirSync recursive で自前 walk。
    const entries = readdirSync(dirAbs, { recursive: true });
    const statusEntries = entries.filter((e) => basename(e) === 'status.json');
    for (const entry of statusEntries) {
      // Windows は '\' 区切りを返す。表示・パス構築は '/' に正規化する。
      const entryPosix = entry.split('\\').join('/');
      const packRel = entryPosix.replace(/\/status\.json$/, '');
      const relPath = `${dirRel}/${entryPosix}`;
      try {
        const json = readJsonFile(join(dirAbs, entry));
        const mapped = mapIgStatus(packRel, json, nowMs);
        events.push(...mapped.events);
        dateless += mapped.dateless;
        legacy += mapped.legacy;
      } catch (err) {
        errors.push({ path: relPath, message: String(err?.message ?? err) });
      }
    }
  } catch (err) {
    ok = false;
    errors.push({ path: dirRel, message: String(err?.message ?? err) });
  }
  return {
    events,
    report: { id: 'ig-status', label: 'ig-status', path: dirRel, ok, count: events.length, dateless, legacy, errors: capErrors(errors) },
  };
}

function readYoutubeSchedule(rootDir, nowMs) {
  const relPath = '.claude/state/youtube-schedule.json';
  try {
    const json = readJsonFile(join(rootDir, relPath));
    const { events, skipped } = mapYoutubeSchedule(json, relPath, nowMs);
    const errors = skipped > 0
      ? [{ path: relPath, message: `${skipped} 件の item が不正な publishAt でスキップ` }]
      : [];
    return {
      events,
      report: { id: 'youtube-schedule', label: 'youtube', path: relPath, ok: true, count: events.length, dateless: 0, legacy: 0, errors },
    };
  } catch (err) {
    return {
      events: [],
      report: { id: 'youtube-schedule', label: 'youtube', path: relPath, ok: false, count: 0, dateless: 0, legacy: 0, errors: [{ path: relPath, message: String(err?.message ?? err) }] },
    };
  }
}

function readBacklogDue(rootDir, todayKey) {
  const relPath = '.claude/todo/backlog.md';
  try {
    const text = readFileSync(join(rootDir, relPath), 'utf8');
    const cards = parseBacklog(text);
    const events = mapBacklogDue(cards, todayKey);
    return {
      events,
      report: { id: 'backlog', label: 'todo', path: relPath, ok: true, count: events.length, dateless: 0, legacy: 0, errors: [] },
    };
  } catch (err) {
    return {
      events: [],
      report: { id: 'backlog', label: 'todo', path: relPath, ok: false, count: 0, dateless: 0, legacy: 0, errors: [{ path: relPath, message: String(err?.message ?? err) }] },
    };
  }
}

/**
 * 6 ソースを独立に読み、共通 ScheduleEvent[] へ集約する（読み取り専用）。
 * 1 ソースの失敗は他ソースを道連れにしない（各々 try/catch 済みの read*関数を呼ぶだけ）。
 * @param {string} rootDir リポジトリルート（絶対パス）
 * @param {{nowMs?: number}} [opts]
 * @returns {Promise<{events: ScheduleEvent[], sources: SourceReport[], generatedAt: string}>}
 */
export async function collectScheduleEvents(rootDir, { nowMs = Date.now() } = {}) {
  const todayKey = todayJst(nowMs);

  const exam = readExamCalendar(rootDir);
  const campaign = readXCampaigns(rootDir);
  const xStatus = readXStatus(rootDir, nowMs);
  const igStatus = readIgStatus(rootDir, nowMs);
  const youtube = readYoutubeSchedule(rootDir, nowMs);
  const backlog = readBacklogDue(rootDir, todayKey);

  const xActual = xStatus.events;
  const xPlanRemaining = reconcileXPlan(campaign.events, xActual, todayKey);

  const events = [
    ...exam.events,
    ...xPlanRemaining,
    ...xActual,
    ...igStatus.events,
    ...youtube.events,
    ...backlog.events,
  ].sort((a, b) => keyOf(a.date, a.time).localeCompare(keyOf(b.date, b.time)));

  // x-campaign の SourceReport は「消し込み後に残った件数」を count にする
  // （events に実際に入るのはこの残数だけなので、ここが 0 件と読めていないの区別を保つ対象）。
  const campaignReport = { ...campaign.report, count: xPlanRemaining.length };

  return {
    events,
    sources: [exam.report, campaignReport, xStatus.report, igStatus.report, youtube.report, backlog.report],
    generatedAt: new Date(nowMs).toISOString(),
  };
}
