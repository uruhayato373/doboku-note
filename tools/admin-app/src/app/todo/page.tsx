import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Facet, FacetHead, FacetShell, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type FacetItem, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { MonthlyReviewPlan } from '@/components/MonthlyReviewPlan';
import { renderMarkdown } from '@/lib/markdown';
import { projectRefsByBacklogId } from '@/lib/project';
import CopyButton from '@/components/CopyButton';
import {
  todoBoard,
  backlogIndex,
  visibleTodoCards,
  KIND_ORDER,
  type TodoCard,
  type Tier,
  type TodoStatus,
  type BacklogRef,
} from '@/lib/todo';
import { todayJst } from '../../../../../scripts/lib/jst-date.mjs';

export const dynamic = 'force-dynamic';

/**
 * TODO は読み取り専用。backlog はタスクマスタ、monthly は [時期:] が今月を含むカード（backlog と同じ表）、
 * weekly は weekly.md の表の各行。annual は /plan/roadmap へ転送する（年間は [時期:] で描く）。
 */

type Query = { f?: string; t?: string; k?: string; id?: string };
type TierKey = Tier | 'none';

const TIERS: { key: TierKey; label: string }[] = [
  { key: 'high', label: '高' },
  { key: 'mid', label: '中' },
  { key: 'low', label: '低' },
  { key: 'hold', label: '判断待ち' },
  { key: 'none', label: '未設定' },
];

const tierKey = (card: TodoCard): TierKey => card.tier ?? 'none';
const tierLabel = (card: TodoCard) => TIERS.find((tier) => tier.key === tierKey(card))?.label ?? '未設定';

function vscodeLink(abs: string, line: number): string {
  return 'vscode://file/' + abs.replace(/\\/g, '/') + ':' + line;
}

function href(q: Query, patch: Partial<Query>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...q, ...patch })) if (value) params.set(key, value);
  const search = params.toString();
  return search ? '/todo?' + search : '/todo';
}

function countBy(cards: TodoCard[], pick: (card: TodoCard) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const key = pick(card);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** facet 1 つ分の項目（先頭に「すべて」）。 */
function facetItems(
  now: Query,
  param: keyof Query,
  active: string | null,
  total: number,
  items: { key: string; label: string; count: number; dot?: string }[],
): FacetItem[] {
  return [
    { key: '__all', label: 'すべて', count: total, href: href(now, { [param]: undefined }), active: !active },
    ...items.map((item) => ({
      key: item.key,
      label: item.dot ? <><span className={'tier-dot ' + item.dot} /> {item.label}</> : item.label,
      count: item.count,
      href: href(now, { [param]: item.key }),
      active: active === item.key,
    })),
  ];
}

function TaskLink({ card }: { card: TodoCard }) {
  return (
    <>
      <a
        className="todo-title"
        href={vscodeLink(card.abs, card.line)}
        title={`${card.path}:${card.line} を VS Code で開く`}
      >
        {card.title}
      </a>
      {card.body ? (
        <details className="todo-task-detail">
          <summary>詳細</summary>
          <div className="md-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(card.body) }} />
        </details>
      ) : null}
    </>
  );
}

function DueBadge({ due }: { due: string | null }) {
  if (!due) return <span className="text-muted-foreground">—</span>;
  const today = todayJst();
  const tone: Tone = due < today ? 'bad' : due === today ? 'warn' : 'neutral';
  return <StatusBadge tone={tone}>{due}</StatusBadge>;
}

/**
 * 実行状態（deriveStatus の出力）の表示。UI は導出結果を出すだけで、状態を新台帳に持たない。
 * BLOCKED は release 理由の SSOT が無いため未実装（todo-lifecycle.md 参照）。
 */
const STATUS_LABEL: Record<TodoStatus, string> = {
  IN_PROGRESS: '進行中',
  THIS_WEEK: '今週',
  THIS_MONTH: '今月',
  PLANNED: '計画あり',
  BACKLOG: '未着手',
};
const STATUS_TONE: Record<TodoStatus, Tone> = {
  IN_PROGRESS: 'warn',
  THIS_WEEK: 'good',
  THIS_MONTH: 'good',
  PLANNED: 'neutral',
  BACKLOG: 'neutral',
};
function LifecycleStatusBadge({ status }: { status: TodoStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

/** claim中の owner・経過時間。経過はサーバレンダ時点のスナップショット（表示専用・記録には使わない）。 */
function ClaimInfo({ claim }: { claim: TodoCard['claim'] }) {
  if (!claim) return null;
  const startedMs = Date.parse(claim.startedAt);
  const minutes = Number.isFinite(startedMs) ? Math.round((Date.now() - startedMs) / 60000) : null;
  const elapsed = minutes == null ? null : minutes >= 60 ? `${Math.round(minutes / 60)}時間` : `${minutes}分`;
  return (
    <div className="text-muted-foreground todo-claim-info">
      claim: {claim.owner}{elapsed ? `・${elapsed}経過` : ''}
    </div>
  );
}

/** .claude/plans/ の実装契約パスを /plans/[...path] ビューアの URL へ変換する（.md 拡張子は落とす）。 */
function planHref(planPath: string): string {
  const rel = planPath.replace(/^\.claude\/plans\//, '').replace(/\.md$/, '');
  return '/plans/' + rel.split('/').map(encodeURIComponent).join('/');
}

/** 台帳結線（backlogIndex ジョイン）。id はあるが台帳に無ければ drift（カード削除後の消し忘れ等）。 */
function BacklogJoinInfo({ id, index }: { id: string | null; index: Map<string, BacklogRef> }) {
  if (!id) return null;
  const ref = index.get(id);
  if (!ref) return <StatusBadge tone="bad">台帳なし</StatusBadge>;
  return (
    <span className="text-muted-foreground todo-plan-join">
      <span className={'tier-dot ' + ref.tier} /> {ref.title}
      {ref.due ? <> ・期日 {ref.due}</> : null}
    </span>
  );
}

/** Claude Code 実行者向け prompt テンプレ（コピーまで。実行はしない）。 */
function buildPrompt(card: TodoCard): string {
  const cardId = card.id ?? '<DN-####>';
  return [
    `カードID: ${cardId}（${card.path}:${card.line}）`,
    `タスク: ${card.title}`,
    `実装契約: ${card.planPath ?? 'plan無し（単純タスク）'}`,
    `ブランチ: ${card.claim?.branch ?? 'develop'}`,
    '実行者: claude-code',
    `着手前: npm run todo:claim -- ${cardId} --owner claude-code`,
    `検証: ${card.verify ?? 'カード本文の完了条件に従う'}`,
    `完了: npm run todo:complete -- ${cardId} --confirm-conditions --commit`,
    '停止条件: 外部公開・課金・削除・deploy・破壊的操作はユーザー承認を得るまで実行しない',
  ].join('\n');
}

function PromptDetails({ card }: { card: TodoCard }) {
  const prompt = buildPrompt(card);
  return (
    <details className="todo-task-detail todo-prompt-detail">
      <summary>prompt</summary>
      <pre className="mono todo-prompt-pre">{prompt}</pre>
      <CopyButton text={prompt} />
    </details>
  );
}

/**
 * このタスクを参照している恒久文書（`docs/**` の `DN-####`）。
 *
 * docs → TODO の片方向だけだと「この戦略はどのタスクで動くのか」は追えても、
 * 「このタスクは何を根拠に立っているのか」が追えない。**往復できることが要件**で、
 * e2e（docs-todo.spec.ts「文書 → TODO → 文書 を往復できる」）が固定している。
 */
function DocRefs({ refs }: { refs?: { slug: string; title: string }[] }) {
  if (!refs?.length) return null;
  return (
    <>
      {refs.map((ref) => (
        <Link className="todo-doc-ref" href={`/docs/${ref.slug}`} key={ref.slug} title={ref.title}>
          {ref.title}
        </Link>
      ))}
    </>
  );
}

function BacklogTable({
  cards,
  focusId,
  docRefs,
}: {
  cards: TodoCard[];
  focusId?: string;
  docRefs: Map<string, { slug: string; title: string }[]>;
}) {
  if (!cards.length) return <p className="text-sm text-muted-foreground">該当するタスクはありません</p>;
  return (
    <TableFrame className="min-w-[680px]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[74px]">優先</TableHead>
          <TableHead>タスク</TableHead>
          <TableHead className="w-[86px] max-[900px]:hidden">種類</TableHead>
          <TableHead className="w-28 max-[900px]:hidden">期日</TableHead>
          <TableHead className="w-[116px] max-[900px]:hidden">状態</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_td]:align-top">
        {cards.map((card) => (
          <TableRow
            key={card.path + card.line}
            id={card.id ?? undefined}
            className={[
              card.wip ? 'is-wip' : '',
              card.id === focusId ? 'todo-card-hit' : '',
            ].filter(Boolean).join(' ') || undefined}
          >
            <TableCell>
              <span className="todo-priority">
                <span className={'tier-dot ' + tierKey(card)} />
                {tierLabel(card)}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal min-w-0 [overflow-wrap:anywhere]">
              <TaskLink card={card} />
              {card.wip ? <ClaimInfo claim={card.claim} /> : null}
              <div className="todo-task-meta">
                {card.id ? <span className="todo-id">{card.id}</span> : null}
                {card.codex ? (
                  <StatusBadge tone="info" title="バルク処理向き（自動dispatchではない）">
                    Codex
                  </StatusBadge>
                ) : null}
                {card.wip ? <StatusBadge tone="warn">進行中</StatusBadge> : null}
                {card.planPath ? <Link className="todo-doc-ref" href={planHref(card.planPath)}>実装計画</Link> : null}
                {card.id ? <DocRefs refs={docRefs.get(card.id)} /> : null}
              </div>
              <PromptDetails card={card} />
            </TableCell>
            <TableCell className="max-[900px]:hidden">{card.kind ? <StatusBadge tone="info">{card.kind}</StatusBadge> : <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell className="max-[900px]:hidden"><DueBadge due={card.due} /></TableCell>
            <TableCell className="max-[900px]:hidden"><LifecycleStatusBadge status={card.lifecycleStatus} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
}

function PlanStatusBadge({ card }: { card: TodoCard }) {
  const raw = card.status || '';
  const status = card.complete
    ? '完了'
    : /ユーザー.*待ち|手動待ち/.test(raw)
      ? '手動待ち'
      : /待ち|保留/.test(raw)
        ? '待ち'
        : /進行|着手中/.test(raw)
          ? '進行中'
          : /未着手/.test(raw)
            ? '未着手'
            : '計画';
  const tone: Tone = card.complete ? 'good' : /待ち|保留/.test(status) ? 'warn' : /進行|着手/.test(status) ? 'info' : 'neutral';
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

function PlanTable({
  cards,
  annual = false,
  backlogRefs,
}: {
  cards: TodoCard[];
  annual?: boolean;
  /** weekly/monthly のみ: backlogIndex() の join 結果（台帳の title/tier/due・drift 検出）。 */
  backlogRefs?: Map<string, BacklogRef>;
}) {
  if (!cards.length) return <p className="text-sm text-muted-foreground">計画項目がありません</p>;
  const ordered = annual ? cards : [...cards].sort((a, b) => Number(a.complete) - Number(b.complete));
  const hasOwner = !annual && cards.some((card) => card.owner);
  return (
    <TableFrame className="min-w-[680px]">
      <TableHeader>
        <TableRow>
          {!annual ? <TableHead className="w-[190px] max-[900px]:w-[150px]">区分</TableHead> : null}
          <TableHead>{annual ? '時期・テーマ' : '実行項目'}</TableHead>
          {!annual ? <TableHead className="w-[116px] max-[900px]:hidden">状態</TableHead> : null}
          {hasOwner ? <TableHead className="w-[92px]">担当</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_td]:align-top">
        {ordered.map((card) => (
          <TableRow key={card.path + card.line} className={card.complete ? 'is-complete' : undefined}>
            {!annual ? <TableCell className="max-[900px]:w-[150px]">{card.section ?? card.fileLabel}</TableCell> : null}
            <TableCell className="whitespace-normal min-w-0 [overflow-wrap:anywhere]">
              <TaskLink card={card} />
              {card.id ? <span className="todo-id">{card.id}</span> : null}
              {backlogRefs ? <BacklogJoinInfo id={card.id} index={backlogRefs} /> : null}
            </TableCell>
            {!annual ? <TableCell><PlanStatusBadge card={card} /></TableCell> : null}
            {hasOwner ? <TableCell>{card.owner ?? <span className="text-muted-foreground">—</span>}</TableCell> : null}
          </TableRow>
        ))}
      </TableBody>
    </TableFrame>
  );
}

export default async function TodoPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  // 年間は /plan/roadmap（[時期:] で描く）が唯一の画面。annual.md のタブは持たない
  if (query.f === 'annual') redirect('/plan/roadmap');
  const board = todoBoard();
  const layer = board.files.some((file) => file.id === query.f) ? query.f! : 'backlog';
  const meta = board.files.find((file) => file.id === layer);
  const layerCards = board.items.filter((item) => item.file === layer);
  const displayedLayerCards = visibleTodoCards(layerCards, layer);
  const isBacklog = layer === 'backlog';
  // 月間は [時期:] が今月を含むカード（backlog の写し）なので、バックログと同じ表で出す
  const isCardList = isBacklog || layer === 'monthly';

  const tier = isBacklog && TIERS.some((item) => item.key === query.t) ? query.t as TierKey : null;
  const kind = isBacklog && query.k && layerCards.some((card) => card.kind === query.k) ? query.k : null;

  const byTier = (cards: TodoCard[]) => tier ? cards.filter((card) => tierKey(card) === tier) : cards;
  const byKind = (cards: TodoCard[]) => kind ? cards.filter((card) => card.kind === kind) : cards;
  const tierScope = byKind(layerCards);
  const kindScope = byTier(layerCards);
  const visible = byTier(tierScope);

  // 逆方向の結線: このタスクを参照している docs 文書（backlog 層でだけ引く）
  const docRefs = isCardList ? projectRefsByBacklogId() : new Map<string, { slug: string; title: string }[]>();

  // weekly は本文を複製せず ID で backlog を参照するので、表示側で join する
  // （月間はカードそのものを出すので join 不要。annual は画面を持たない）。
  const backlogRefs = layer === 'weekly' ? backlogIndex() : undefined;

  const tierCounts = countBy(tierScope, tierKey);
  const kindCounts = countBy(kindScope, (card) => card.kind);
  const kindKeys = [
    ...KIND_ORDER.filter((key) => kindCounts.has(key)),
    ...[...kindCounts.keys()].filter((key) => !KIND_ORDER.includes(key)).sort(),
  ];
  const now: Query = { t: tier ?? undefined, k: kind ?? undefined };

  const activeCount = layerCards.filter((card) => !card.complete).length;
  const completeCount = layerCards.length - activeCount;
  const completedAreHidden = displayedLayerCards.length !== layerCards.length;
  const sub = isBacklog
    ? `${visible.length} / ${layerCards.length}件を表示`
    : layer === 'monthly'
      ? `${board.month.slice(0, 4)}年${Number(board.month.slice(5))}月 · [時期:] が今月を含むカード ${layerCards.length}件`
    : `${meta?.title ?? meta?.label ?? layer} · 未完了 ${activeCount}件${completeCount && !completedAreHidden ? ` / 完了 ${completeCount}件` : ''}`;

  const main = isCardList ? (
    <BacklogTable cards={isBacklog ? visible : displayedLayerCards} focusId={query.id} docRefs={docRefs} />
  ) : (
    <PlanTable cards={displayedLayerCards} annual={layer === 'annual'} backlogRefs={backlogRefs} />
  );
  const rail = isBacklog && (
    <>
      <FacetHead clearHref={tier || kind ? '/todo' : null} />
      <Facet
        title="優先度"
        items={facetItems(
          now,
          't',
          tier,
          tierScope.length,
          TIERS.filter((item) => tierCounts.has(item.key) || tier === item.key).map((item) => ({
            key: item.key,
            label: item.label,
            count: tierCounts.get(item.key) ?? 0,
            dot: item.key,
          })),
        )}
      />
      <Facet
        title="種類"
        items={facetItems(now, 'k', kind, kindScope.length, kindKeys.map((key) => ({ key, label: key, count: kindCounts.get(key) ?? 0 })))}
      />
    </>
  );

  return (
    <>
      <PageHead title={meta?.label ?? 'TODO'} sub={sub} />

      {!isBacklog && meta?.summary ? (
        <p className="todo-plan-focus"><strong>焦点</strong>{meta.summary}</p>
      ) : null}
      {layer === 'monthly' && meta?.notes ? (
        <PanelCard title="今月の成果目標" className="mb-3">
          <div className="md-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(meta.notes) }} />
        </PanelCard>
      ) : null}
      {layer === 'monthly' ? <MonthlyReviewPlan /> : null}

      {isBacklog ? <FacetShell main={main} rail={rail} /> : main}
    </>
  );
}
