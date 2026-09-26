import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo-root';
import {
  parseBacklog as parseBacklogCards,
  TIER as TIER_VOCAB,
  TODO_LAYER_FILES,
  TODO_DIR,
  KINDS,
  whenCovers,
} from '../../../../scripts/lib/backlog-lib.mjs';
import { todayJst } from '../../../../scripts/lib/jst-date.mjs';
import { listPlanUnits } from '../../../../scripts/lib/plan-units.mjs';

/**
 * todo.ts — .claude/todo/*.md の read-only 統合ビュー。
 *
 * backlog.md のパース契約は **scripts/lib/backlog-lib.mjs が唯一の実装**。
 * ここは結果に {file, fileLabel, path, abs} を被せるアダプタに徹する。
 *
 * データも二重管理しない: .claude/todo/*.md を読むだけで、書き込み経路を持たない
 * （編集は VS Code リンクで元ファイルを開く）。層の集合（4 層）と tier 語彙も
 * backlog-lib から import し、ここが持つのは表示メタ（ラベル・見出しレベル）だけ。
 *
 * 2026-08-18 まではここに手書きの重複実装があり、`実行:`/`検証:`/`起票:` を特別扱いせず
 * 「Codex候補 以外の最初の token」を category にしていた。そのため `[種類:不具合]` を
 * タグ行の先頭に置くとカテゴリバッジが「種類:不具合」と表示される状態だった。
 * 同一性を保証する機械が無いまま 2 実装を維持しない（tests/backlog-parity.test.mjs が固定）。
 */

export type Tier = 'high' | 'mid' | 'low' | 'hold';

/** todo-claims.json の1件（scripts/lib/todo-lifecycle.mjs emptyClaimsStore() のスキーマに準拠）。 */
export interface TodoClaim {
  owner: string;
  startedAt: string;
  branch: string | null;
}

/**
 * カードの実行状態（導出のみ・新台帳を持たない）。優先順は IN_PROGRESS > THIS_WEEK >
 * THIS_MONTH > PLANNED > BACKLOG（todo-lifecycle.md「原則」参照）。
 * BLOCKED は release 理由の SSOT が無いため未実装。
 */
export type TodoStatus = 'IN_PROGRESS' | 'THIS_WEEK' | 'THIS_MONTH' | 'PLANNED' | 'BACKLOG';

/** 状態導出の純関数。UI・CLI・Agent が同じルールを再実装しないための唯一の実装。 */
export function deriveStatus(opts: { wip: boolean; inWeekly: boolean; inMonthly: boolean; hasPlan: boolean }): TodoStatus {
  if (opts.wip) return 'IN_PROGRESS';
  if (opts.inWeekly) return 'THIS_WEEK';
  if (opts.inMonthly) return 'THIS_MONTH';
  if (opts.hasPlan) return 'PLANNED';
  return 'BACKLOG';
}

/**
 * 種類チップの並び順。件数順にすると押すたびにボタンが動いて押し間違えるので、
 * 語彙の宣言順で固定する。語彙そのものは backlog-lib が真実源で、ここは
 * admin -> scripts/lib の唯一の窓口として素通しするだけ（値を持たない）。
 *
 * カテゴリ軸は 2026-08-18 に UI から廃止した（6 値が常に全部並ぶわりに絞る動機が無く、
 * 優先度・種類と 3 段になって本文を押し下げていた）。CANONICAL_CATEGORIES の
 * 検査は check-backlog-schema が backlog-lib から直接読むので、ここでの再 export は不要。
 */
export const KIND_ORDER = KINDS as string[];

const TIER = TIER_VOCAB as Record<string, Tier>;

interface FileSpec {
  id: string;
  file: string;
  label: string;
  mode: 'backlog' | 'sections';
  level?: number;
}

/** 表示メタだけを持つ。「どのファイルが層か」は backlog-lib の TODO_LAYER_FILES が真実源。 */
const LAYER_META: Record<string, Omit<FileSpec, 'file'>> = {
  'backlog.md': { id: 'backlog', label: 'バックログ', mode: 'backlog' },
  'weekly.md': { id: 'weekly', label: '週間', mode: 'sections', level: 2 },
  // 2026-08-18 の ID 参照化で monthly は `## 今月の成果目標` / `## 選択タスク` の 2 節構成へ。
  // level:3 のままだと節が 1 つも取れずボードが空になる（todo-standards の monthly 形式に合わせる）
  'monthly.md': { id: 'monthly', label: '月間', mode: 'sections', level: 2 },
  'annual.md': { id: 'annual', label: '年間', mode: 'sections', level: 3 },
};

const FILES: FileSpec[] = (TODO_LAYER_FILES as string[]).map((file) => {
  const meta = LAYER_META[file];
  // 層を増やしたのに表示メタを足し忘れたら、黙って 1 タブ消えるのではなく起動時に落とす
  if (!meta) throw new Error(`${TODO_DIR}/${file} の表示メタが未定義（LAYER_META に追加する）`);
  return { file, ...meta };
});

export interface TodoCard {
  file: string;
  fileLabel: string;
  path: string;
  abs: string;
  line: number;
  tier: Tier | null;
  /** カード ID（DN-####）。backlog 以外の層は null */
  id: string | null;
  category: string;
  /** タスクの種類（不具合 / 改善 / 意思決定 / 制作 / 定期）。backlog 以外は null */
  kind: string | null;
  due: string | null;
  wip: boolean;
  title: string;
  codex: boolean;
  body: string;
  /** `[時期:]`（やる月）。backlog カードのみ。年間ロードマップと月間はこの値だけで決まる。 */
  when: string | null;
  /** `[領域:]`（事業の領域ラベル）。backlog カードのみ。 */
  domain: string | null;
  /** 週次・月次の表を束ねる見出し。backlog は null。 */
  section: string | null;
  /** 計画表に書かれた状態（自由文字列。plan 層のみ）。backlog は null。 */
  status: string | null;
  owner: string | null;
  complete: boolean;
  source: 'backlog' | 'plan';
  /** `[検証:cmd]` タグの値。backlog カードのみ。plan 層は null。 */
  verify: string | null;
  /** todo-claims.json から引いた claim。backlog カードのみ（id が無い/未claimなら null）。 */
  claim: TodoClaim | null;
  /** .claude/plans/ の実装契約パス。backlog カードのみ（無ければ null）。 */
  planPath: string | null;
  /**
   * 導出済みの実行状態（backlog カードのみ。plan 層の行は null＝この軸を持たない）。
   * SSOT は backlog.md の [進行中]・[時期:]（今月）・weekly.md の表への DN-#### 掲載・plan unit の有無。
   */
  lifecycleStatus: TodoStatus | null;
}

/**
 * 週間・月間は「これから実行する項目」を選ぶ画面なので、完了済みは一覧と件数から外す。
 * 年間は達成済みマイルストーンも振り返る用途があるため、従来どおり全件を残す。
 */
export function visibleTodoCards<T extends { complete: boolean }>(cards: T[], layer: string): T[] {
  return layer === 'weekly' || layer === 'monthly'
    ? cards.filter((card) => !card.complete)
    : cards;
}

function tierOf(text: string): Tier | null {
  for (const [emoji, tier] of Object.entries(TIER)) if (text.includes(emoji)) return tier;
  return null;
}

function parseBacklog(lines: string[], f: FileSpec, todoDir: string): TodoCard[] {
  const cards = parseBacklogCards(lines.join('\n')) as Array<{
    line: number;
    tier: Tier;
    id: string | null;
    title: string;
    category: string;
    kind: string | null;
    codex: boolean;
    due: string | null;
    wip: boolean;
    body: string;
    verify: string | null;
    when: string | null;
    domain: string | null;
  }>;
  return cards.map((c) => ({
    file: f.id,
    fileLabel: f.label,
    path: `${TODO_DIR}/${f.file}`,
    abs: join(todoDir, f.file),
    line: c.line,
    tier: c.tier,
    id: c.id ?? null,
    category: c.category,
    kind: c.kind,
    due: c.due,
    wip: c.wip,
    title: c.title,
    codex: c.codex,
    body: c.body,
    when: c.when ?? null,
    domain: c.domain ?? null,
    section: null,
    status: null,
    owner: null,
    complete: false,
    source: 'backlog' as const,
    verify: c.verify ?? null,
    claim: null,
    planPath: null,
    lifecycleStatus: null,
  }));
}

/** Markdown 表の1行を、escaped pipe を壊さずセルへ分割する。 */
function splitTableRow(line: string): string[] {
  const raw = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      cell += ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
      cell += ch;
    } else if (ch === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

const isTableDivider = (line: string) =>
  /^\s*\|?\s*:?-{3,}/.test(line) && line.includes('|');

/** 一覧セルでは装飾記号を外す。詳細本文のMarkdownは renderMarkdown 側へ残す。 */
function plainInline(raw: string): string {
  return raw
    .replace(/<!--.*?-->/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/~~|\*\*|__|`/g, '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function planTier(priority: string): Tier | null {
  if (priority.includes('🔴')) return 'high';
  if (priority.includes('🟡')) return 'mid';
  if (priority.includes('🟢')) return 'low';
  if (priority.includes('🟣')) return 'hold';
  return null;
}

/** 説明中の「完了条件」「完了後」を完了状態と誤認しない。 */
export function isPlanItemComplete(rawTitle: string, priority: string, status: string): boolean {
  if (rawTitle.includes('~~') || priority.includes('✅')) return true;
  return /^(?:✅|☑️?|完了(?:済み)?|対応済み|実施済み|済み)(?:\s|[（(:：。、]|$)/u.test(status.trim());
}

function planSection(raw: string): string {
  if (raw.includes('今週やること')) return '今週';
  if (raw.includes('手動キュー')) return '手動';
  return raw.replace(/\s*（[^）]*）\s*$/, '').trim();
}

/**
 * weekly/monthly の表は「章」ではなく行がタスク。表の列名を契約として読み、
 * 見出し・完了サマリ・やらないことをタスクへ誤変換しない。
 */
function parsePlanTables(lines: string[], f: FileSpec, todoDir: string): TodoCard[] {
  const out: TodoCard[] = [];
  let h2 = '';
  let h3 = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const m2 = line.match(/^##\s+(.*)/);
    if (m2) {
      h2 = plainInline(m2[1]!);
      h3 = '';
      continue;
    }
    const m3 = line.match(/^###\s+(.*)/);
    if (m3) {
      h3 = plainInline(m3[1]!);
      continue;
    }

    if (!line.trim().startsWith('|') || !lines[i + 1] || !isTableDivider(lines[i + 1]!)) continue;
    const headers = splitTableRow(line).map(plainInline);
    const idIndex = headers.findIndex((v) => v === 'ID');
    const titleIndex = headers.findIndex((v) =>
      v === 'タスク' || v.includes('タスク') || v.includes('出口'),
    );
    if (titleIndex < 0) continue;

    i += 2;
    for (; i < lines.length && lines[i]!.trim().startsWith('|'); i += 1) {
      const cells = splitTableRow(lines[i]!);
      const rawTitle = cells[titleIndex] ?? '';
      const id = idIndex >= 0 ? plainInline(cells[idIndex] ?? '') : '';
      // weekly は太字部分を短いタスク名、その後ろを説明として書く運用。
      // セル全文をタイトルにすると一覧で数行を占有するため、意味のある先頭だけを採る。
      const emphasized = rawTitle.match(/\*\*(.+?)\*\*/);
      const title = plainInline(emphasized?.[1] ?? rawTitle);
      const titleRemainder = emphasized ? plainInline(rawTitle.replace(emphasized[0], '')) : '';
      if (!title) continue;
      const cell = (...names: string[]) => {
        const index = headers.findIndex((v) => names.some((name) => v === name || v.includes(name)));
        return index >= 0 ? plainInline(cells[index] ?? '') : '';
      };
      const priority = cell('優先', '優先度');
      const status = cell('状態', 'Status') || (rawTitle.includes('~~') ? '完了' : '未着手');
      const ownerRaw = cell('担当', 'Owner');
      const owner = ownerRaw.replace(/\s*\[Codex候補\]\s*/, '').trim() || null;
      const complete = isPlanItemComplete(rawTitle, priority, status);
      const detail = [titleRemainder, ...headers
        .map((header, index) => ({ header, value: cells[index] ?? '' }))
        .filter(({ header, value }, index) =>
          index !== titleIndex && value.trim() &&
          !['優先', '優先度', '状態', 'Status', '担当', 'Owner'].some((name) => header.includes(name)),
        )
        .map(({ header, value }) => `**${header}**: ${value}`)]
        .filter(Boolean)
        .join('\n\n');

      out.push({
        id: /^DN-\d{4}$/.test(id) ? id : null,
        file: f.id,
        fileLabel: f.label,
        path: `${TODO_DIR}/${f.file}`,
        abs: join(todoDir, f.file),
        line: i + 1,
        tier: planTier(priority),
        category: planSection(h3 || h2 || f.label),
        kind: null,
        due: null,
        wip: /進行中|着手中/.test(status),
        title,
        codex: rawTitle.includes('Codex候補') || ownerRaw.includes('Codex候補') || detail.includes('Codex候補'),
        body: detail,
        when: null,
        domain: null,
        section: planSection(h3 || h2 || f.label),
        status: complete ? '完了' : status,
        owner,
        complete,
        source: 'plan',
        verify: null,
        claim: null,
        planPath: null,
        lifecycleStatus: null,
      });
    }
    i -= 1;
  }

  // weekly の「手動キュー」は表ではなく箇条書き。今週やらないこと・メモは対象外。
  if (f.id === 'weekly') {
    let section = '';
    lines.forEach((line, index) => {
      if (/^##\s+/.test(line)) {
        section = '';
        return;
      }
      const heading = line.match(/^###\s+(.*)/);
      if (heading) {
        section = plainInline(heading[1]!);
        return;
      }
      if (!section.includes('手動キュー')) return;
      const item = line.match(/^-\s+\*\*(.+?)\*\*(?:\s*[—–-]\s*)?(.*)$/);
      if (!item) return;
      out.push({
        id: null,
        file: f.id,
        fileLabel: f.label,
        path: `${TODO_DIR}/${f.file}`,
        abs: join(todoDir, f.file),
        line: index + 1,
        tier: null,
        category: planSection(section),
        kind: null,
        due: null,
        wip: false,
        title: plainInline(item[1]!),
        codex: false,
        body: plainInline(item[2] ?? ''),
        when: null,
        domain: null,
        section: planSection(section),
        status: '手動待ち',
        owner: 'ユーザー',
        complete: false,
        source: 'plan',
        verify: null,
        claim: null,
        planPath: null,
        lifecycleStatus: null,
      });
    });
  }

  return out;
}

function parseSections(lines: string[], f: FileSpec, todoDir: string): TodoCard[] {
  const out: TodoCard[] = [];
  let cur: (TodoCard & { bodyLines: string[] }) | null = null;
  const level = f.level ?? 2;
  const open = new RegExp(`^#{${level}}\\s+(.*)`);
  const close = new RegExp(`^#{1,${level}}\\s+`);
  const flush = () => {
    if (cur) {
      const { bodyLines, ...card } = cur;
      card.body = bodyLines.join('\n').trim();
      out.push(card);
      cur = null;
    }
  };
  lines.forEach((ln, i) => {
    const m = ln.match(open);
    if (m) {
      flush();
      const title = m[1]!.trim();
      cur = {
        file: f.id,
        fileLabel: f.label,
        path: `${TODO_DIR}/${f.file}`,
        abs: join(todoDir, f.file),
        line: i + 1,
        tier: tierOf(title),
        id: null,
        category: f.label,
        kind: null,
        due: null,
        wip: false,
        title,
        codex: false,
        body: '',
        bodyLines: [],
        when: null,
        domain: null,
        section: null,
        status: null,
        owner: null,
        complete: false,
        source: 'plan',
        verify: null,
        claim: null,
        planPath: null,
        lifecycleStatus: null,
      };
      return;
    }
    if (cur && close.test(ln)) {
      flush();
      return;
    }
    if (cur) cur.bodyLines.push(ln);
  });
  flush();
  return out;
}

export interface TodoBoard {
  files: { id: string; label: string; path: string; count: number; title: string; summary: string; notes: string }[];
  /** 月間の対象月（JST の今月 'YYYY-MM'）。月間の一覧は [時期:] がこの月を含むカード。 */
  month: string;
  counts: Record<string, number>;
  items: TodoCard[];
}

/** todo-claims.json を id → claim の Map で返す。壊れていても空 Map にフォールバックする（他画面を落とさない）。 */
function readClaims(): Map<string, TodoClaim> {
  try {
    const raw = readFileSync(repoPath('.claude', 'state', 'todo-claims.json'), 'utf8');
    const parsed = JSON.parse(raw) as { claims?: Array<{ id: string; owner: string; startedAt: string; branch: string | null }> };
    const list = Array.isArray(parsed?.claims) ? parsed.claims : [];
    return new Map(list.map((c) => [c.id, { owner: c.owner, startedAt: c.startedAt, branch: c.branch ?? null }]));
  } catch {
    return new Map();
  }
}

/** `## 見出し` の本文（次の `## ` まで）を Markdown のまま取り出す。無ければ空。 */
function sectionText(lines: string[], heading: RegExp): string {
  const start = lines.findIndex((l) => /^##\s+/.test(l) && heading.test(l));
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^##?\s+/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').replace(/^-{3,}\s*$/gm, '').trim();
}

/**
 * 4 層のボード。層の意味（2026-09-26〜）:
 *  - backlog: カード（正本）
 *  - monthly: [時期:] が今月を含むカード（導出・monthly.md は「今月の成果目標」だけ）
 *  - weekly : weekly.md の表（今月のカードから週ごとに選ぶ手書きの計画）
 *  - annual : annual.md の方針。年間の中身は [時期:] で /plan/roadmap が描く（サイドバーには出さない）
 */
export function todoBoard(): TodoBoard {
  // パスを分割して書かない（'docs','todo' の分割記法が一括置換から漏れ、移設時に
  // ボードが黙って 0 件になりかけた）。置き場は backlog-lib の TODO_DIR が唯一の宣言。
  const todoDir = repoPath(...(TODO_DIR as string).split('/'));
  const month = (todayJst() as string).slice(0, 7);
  const items: TodoCard[] = [];
  for (const f of FILES) {
    const p = join(todoDir, f.file);
    if (!existsSync(p)) continue;
    // 月間は monthly.md の表を読まない（[時期:] から下で導出する）
    if (f.id === 'monthly') continue;
    const lines = readFileSync(p, 'utf8').split(/\r?\n/);
    items.push(...(
      f.mode === 'backlog'
        ? parseBacklog(lines, f, todoDir)
        : f.id === 'weekly'
          ? parsePlanTables(lines, f, todoDir)
          : parseSections(lines, f, todoDir)
    ));
  }

  // 今週＝weekly.md の表の行に書かれた ID だけ（「今週やらないこと」など本文中の ID は拾わない）。
  // 今月＝[時期:] が今月を含むカード（monthly.md への手書きの掲載ではない）。
  const weeklyIds = new Set(items.filter((i) => i.file === 'weekly' && i.id).map((i) => i.id as string));
  const claims = readClaims();
  // masterPath（実ドキュメント）を使う。u.path（unit のディレクトリ/ファイル自体）だと
  // dir 型で /plans/[...path] が解決できないリンクになる（2026-08-26 admin 目視で発見）。
  const planPathByTaskId = new Map(
    listPlanUnits(repoPath())
      .filter((u) => u.masterPath)
      .map((u) => [u.taskId, u.masterPath as string]),
  );
  const decorated = items.map((it) => {
    if (it.source !== 'backlog') return it;
    const claim = it.id ? claims.get(it.id) ?? null : null;
    const planPath = it.id ? planPathByTaskId.get(it.id) ?? null : null;
    return {
      ...it,
      claim,
      planPath,
      lifecycleStatus: deriveStatus({
        wip: it.wip,
        inWeekly: it.id ? weeklyIds.has(it.id) : false,
        inMonthly: whenCovers(it.when, month),
        hasPlan: Boolean(planPath),
      }),
    };
  });
  // 月間の一覧＝今月のカード（backlog カードに file:'monthly' を付けた表示用の写し。台帳は backlog.md だけ）
  const monthlyCards = decorated
    .filter((it) => it.source === 'backlog' && whenCovers(it.when, month))
    .map((it) => ({ ...it, file: 'monthly', fileLabel: '月間' }));
  const all = [...decorated, ...monthlyCards];

  const counts: Record<string, number> = { high: 0, mid: 0, low: 0, hold: 0, none: 0 };
  for (const it of decorated) if (it.source === 'backlog') counts[it.tier ?? 'none']!++;
  return {
    month,
    files: FILES.filter((f) => existsSync(join(todoDir, f.file))).map((f) => {
      const lines = readFileSync(join(todoDir, f.file), 'utf8').split(/\r?\n/);
      const title = plainInline(lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, '') ?? f.label);
      const summaryLine = lines.find((line) => /^\*\*(今週のゴール|今週の成果|フォーカス)\*\*:/.test(line));
      const summary = plainInline(summaryLine?.replace(/^\*\*[^*]+\*\*:\s*/, '') ?? '');
      const notes =
        f.id === 'monthly' ? sectionText(lines, /今月の成果目標/)
        : f.id === 'annual'
          ? [['注力しないもの', /注力しない/], ['四半期定例', /四半期定例/]]
              .map(([h, re]) => { const t = sectionText(lines, re as RegExp); return t ? `### ${h}\n\n${t}` : ''; })
              .filter(Boolean)
              .join('\n\n')
        : '';
      const fileItems = all.filter((i) => i.file === f.id);
      return {
        id: f.id,
        label: f.label,
        path: `${TODO_DIR}/${f.file}`,
        count: visibleTodoCards(fileItems, f.id).length,
        title: f.id === 'monthly' ? `${Number(month.slice(5))}月のカード` : title,
        summary,
        notes,
      };
    }),
    counts,
    items: all,
  };
}

/**
 * backlog の ID 索引。monthly/weekly は本文を複製せず ID で参照するので、
 * 画面側はここで join してタイトル・tier・種類・担当・期日を出す（2026-08-18〜）。
 * 参照切れ ID は呼び出し側が警告表示する。
 */
export interface BacklogRef {
  id: string;
  title: string;
  tier: Tier;
  kind: string | null;
  due: string | null;
  line: number;
  path: string;
}

export function backlogIndex(): Map<string, BacklogRef> {
  const todoDir = repoPath(...(TODO_DIR as string).split('/'));
  const p = join(todoDir, 'backlog.md');
  const out = new Map<string, BacklogRef>();
  if (!existsSync(p)) return out;
  const cards = parseBacklogCards(readFileSync(p, 'utf8')) as Array<{
    id: string | null;
    title: string;
    tier: Tier;
    kind: string | null;
    due?: string | null;
    line: number;
  }>;
  for (const c of cards) {
    if (!c.id) continue;
    out.set(c.id, {
      id: c.id,
      title: c.title,
      tier: c.tier,
      kind: c.kind,
      due: c.due ?? null,
      line: c.line,
      path: `${TODO_DIR}/backlog.md`,
    });
  }
  return out;
}

/** 本文中の DN-#### を拾う（/docs の文書からの関連タスク表示にも使う）。 */
export function extractBacklogIds(text: string): string[] {
  return [...new Set(text.match(/DN-\d{4}/g) ?? [])].sort();
}
