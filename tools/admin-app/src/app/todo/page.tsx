import Link from 'next/link';
import { PageHead } from '@/components/ui';
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

export const dynamic = 'force-dynamic';

/**
 * TODO は読み取り専用。backlog はタスクマスタ、weekly/monthly は表の各行、annual は
 * 季節マイルストーンとして表示する。層によって意味が違うため、同じカードUIへ押し込まない。
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

function Facet({
  title,
  param,
  now,
  active,
  total,
  items,
}: {
  title: string;
  param: keyof Query;
  now: Query;
  active: string | null;
  total: number;
  items: { key: string; label: string; count: number; dot?: string }[];
}) {
  return (
    <section className="facet">
      <h4>{title}</h4>
      <Link href={href(now, { [param]: undefined })} className={active ? '' : 'active'}>
        <span className="fl">すべて</span>
        <span className="n">{total}</span>
      </Link>
      {items.map((item) => (
        <Link
          key={item.key}
          href={href(now, { [param]: item.key })}
          className={active === item.key ? 'active' : ''}
        >
          {item.dot ? <span className={'tier-dot ' + item.dot} /> : null}
          <span className="fl">{item.label}</span>
          <span className="n">{item.count}</span>
        </Link>
      ))}
    </section>
  );
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
  if (!due) return <span className="muted">—</span>;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const cls = due < today ? 'bad' : due === today ? 'warn' : 'neutral';
  return <span className={'badge ' + cls}>{due}</span>;
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
const STATUS_CLASS: Record<TodoStatus, string> = {
  IN_PROGRESS: 'warn',
  THIS_WEEK: 'good',
  THIS_MONTH: 'good',
  PLANNED: 'neutral',
  BACKLOG: 'neutral',
};
function LifecycleStatusBadge({ status }: { status: TodoStatus | null }) {
  if (!status) return <span className="muted">—</span>;
  return <span className={'badge ' + STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>;
}

/** claim中の owner・経過時間。経過はサーバレンダ時点のスナップショット（表示専用・記録には使わない）。 */
function ClaimInfo({ claim }: { claim: TodoCard['claim'] }) {
  if (!claim) return null;
  const startedMs = Date.parse(claim.startedAt);
  const minutes = Number.isFinite(startedMs) ? Math.round((Date.now() - startedMs) / 60000) : null;
  const elapsed = minutes == null ? null : minutes >= 60 ? `${Math.round(minutes / 60)}時間` : `${minutes}分`;
  return (
    <div className="muted todo-claim-info">
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
  if (!ref) return <span className="badge bad">台帳なし</span>;
  return (
    <span className="muted todo-plan-join">
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
  if (!cards.length) return <div className="empty">該当するタスクはありません</div>;
  return (
    <div className="table-wrap todo-table-wrap">
      <table className="data todo-table">
        <thead>
          <tr>
            <th className="todo-priority-col">優先</th>
            <th>タスク</th>
            <th className="todo-kind-col">種類</th>
            <th className="todo-due-col">期日</th>
            <th className="todo-status-col">状態</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr
              key={card.path + card.line}
              id={card.id ?? undefined}
              className={[
                card.wip ? 'is-wip' : '',
                card.id === focusId ? 'todo-card-hit' : '',
              ].filter(Boolean).join(' ') || undefined}
            >
              <td>
                <span className="todo-priority">
                  <span className={'tier-dot ' + tierKey(card)} />
                  {tierLabel(card)}
                </span>
              </td>
              <td className="todo-task-cell">
                <TaskLink card={card} />
                {card.wip ? <ClaimInfo claim={card.claim} /> : null}
                <div className="todo-task-meta">
                  {card.id ? <span className="todo-id">{card.id}</span> : null}
                  {card.codex ? (
                    <span className="badge accent" title="バルク処理向き（自動dispatchではない）">
                      Codex
                    </span>
                  ) : null}
                  {card.wip ? <span className="badge warn">進行中</span> : null}
                  {card.planPath ? <Link className="todo-doc-ref" href={planHref(card.planPath)}>実装計画</Link> : null}
                  {card.id ? <DocRefs refs={docRefs.get(card.id)} /> : null}
                </div>
                <PromptDetails card={card} />
              </td>
              <td className="todo-kind-cell">{card.kind ? <span className="badge soft">{card.kind}</span> : <span className="muted">—</span>}</td>
              <td className="todo-due-cell"><DueBadge due={card.due} /></td>
              <td className="todo-status-cell"><LifecycleStatusBadge status={card.lifecycleStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ card }: { card: TodoCard }) {
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
  const cls = card.complete ? 'good' : /待ち|保留/.test(status) ? 'warn' : /進行|着手/.test(status) ? 'accent' : 'neutral';
  return <span className={'badge ' + cls}>{status}</span>;
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
  if (!cards.length) return <div className="empty">計画項目がありません</div>;
  const ordered = annual ? cards : [...cards].sort((a, b) => Number(a.complete) - Number(b.complete));
  const hasOwner = !annual && cards.some((card) => card.owner);
  return (
    <div className="table-wrap todo-table-wrap">
      <table className="data todo-table todo-plan-table">
        <thead>
          <tr>
            {!annual ? <th className="todo-section-col">区分</th> : null}
            <th>{annual ? '時期・テーマ' : '実行項目'}</th>
            {!annual ? <th className="todo-status-col">状態</th> : null}
            {hasOwner ? <th className="todo-owner-col">担当</th> : null}
          </tr>
        </thead>
        <tbody>
          {ordered.map((card) => (
            <tr key={card.path + card.line} className={card.complete ? 'is-complete' : undefined}>
              {!annual ? <td className="todo-section-cell">{card.section ?? card.fileLabel}</td> : null}
              <td className="todo-task-cell">
                <TaskLink card={card} />
                {card.id ? <span className="todo-id">{card.id}</span> : null}
                {backlogRefs ? <BacklogJoinInfo id={card.id} index={backlogRefs} /> : null}
              </td>
              {!annual ? <td><StatusBadge card={card} /></td> : null}
              {hasOwner ? <td>{card.owner ?? <span className="muted">—</span>}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TodoPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const board = todoBoard();
  const layer = board.files.some((file) => file.id === query.f) ? query.f! : 'backlog';
  const meta = board.files.find((file) => file.id === layer);
  const layerCards = board.items.filter((item) => item.file === layer);
  const displayedLayerCards = visibleTodoCards(layerCards, layer);
  const isBacklog = layer === 'backlog';

  const tier = isBacklog && TIERS.some((item) => item.key === query.t) ? query.t as TierKey : null;
  const kind = isBacklog && query.k && layerCards.some((card) => card.kind === query.k) ? query.k : null;

  const byTier = (cards: TodoCard[]) => tier ? cards.filter((card) => tierKey(card) === tier) : cards;
  const byKind = (cards: TodoCard[]) => kind ? cards.filter((card) => card.kind === kind) : cards;
  const tierScope = byKind(layerCards);
  const kindScope = byTier(layerCards);
  const visible = byTier(tierScope);

  // 逆方向の結線: このタスクを参照している docs 文書（backlog 層でだけ引く）
  const docRefs = isBacklog ? projectRefsByBacklogId() : new Map<string, { slug: string; title: string }[]>();

  // weekly/monthly は本文を複製せず ID で backlog を参照するので、表示側で join する
  // （todo.ts の docstring どおり。annual は ID 参照を持たないため対象外）。
  const backlogRefs = layer === 'weekly' || layer === 'monthly' ? backlogIndex() : undefined;

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
    : `${meta?.title ?? meta?.label ?? layer} · 未完了 ${activeCount}件${completeCount && !completedAreHidden ? ` / 完了 ${completeCount}件` : ''}`;

  return (
    <>
      <PageHead title={meta?.label ?? 'TODO'} sub={sub} />

      {!isBacklog && meta?.summary ? (
        <p className="todo-plan-focus"><strong>焦点</strong>{meta.summary}</p>
      ) : null}

      <div className={'todo-shell' + (isBacklog ? '' : ' plan-only')}>
        <div className="todo-main">
          {isBacklog ? (
            <BacklogTable cards={visible} focusId={query.id} docRefs={docRefs} />
          ) : (
            <PlanTable cards={displayedLayerCards} annual={layer === 'annual'} backlogRefs={backlogRefs} />
          )}
        </div>

        {isBacklog ? (
          <aside className="todo-rail">
            <div className="rail-head">
              <span>絞り込み</span>
              {tier || kind ? <Link href="/todo">すべて解除</Link> : null}
            </div>
            <Facet
              title="優先度"
              param="t"
              now={now}
              active={tier}
              total={tierScope.length}
              items={TIERS.filter((item) => tierCounts.has(item.key) || tier === item.key).map((item) => ({
                key: item.key,
                label: item.label,
                count: tierCounts.get(item.key) ?? 0,
                dot: item.key,
              }))}
            />
            <Facet
              title="種類"
              param="k"
              now={now}
              active={kind}
              total={kindScope.length}
              items={kindKeys.map((key) => ({ key, label: key, count: kindCounts.get(key) ?? 0 }))}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
}
