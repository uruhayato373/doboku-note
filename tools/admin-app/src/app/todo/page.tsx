import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { todoBoard, type TodoCard, type Tier } from '@/lib/todo';

export const dynamic = 'force-dynamic';

const TIER_META: { key: Tier; label: string }[] = [
  { key: 'high', label: '🔴 高' },
  { key: 'mid', label: '🟡 中' },
  { key: 'low', label: '🟢 低' },
  { key: 'hold', label: '🟣 保留' },
];

/** vscode://file/<abs>:<line>（Windows パスは / へ正規化）。 */
function vscodeLink(abs: string, line: number): string {
  return `vscode://file/${abs.replace(/\\/g, '/')}:${line}`;
}

function Card({ c }: { c: TodoCard }) {
  return (
    <div className={'todo-card tier-' + (c.tier ?? 'none')}>
      <div className="title">{c.title}</div>
      <div className="row">
        <span className="badge neutral">{c.category}</span>
        {c.codex ? <span className="badge accent">Codex候補</span> : null}
        <a href={vscodeLink(c.abs, c.line)} className="muted">
          {c.path}:{c.line}
        </a>
      </div>
    </div>
  );
}

export default async function TodoPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sp = await searchParams;
  const board = todoBoard();
  const activeFile = board.files.some((f) => f.id === sp.f) ? sp.f! : 'backlog';
  const items = board.items.filter((i) => i.file === activeFile);

  return (
    <>
      <PageHead
        title="TODO ボード"
        sub={`docs/todo/*.md · 🔴${board.counts.high} 🟡${board.counts.mid} 🟢${board.counts.low} 🟣${board.counts.hold}（読み取り専用・編集は VS Code リンクから）`}
      />

      <div className="filterbar">
        {board.files.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'backlog' ? '/todo' : `/todo?f=${f.id}`}
            className={'chip' + (activeFile === f.id ? ' active' : '')}
          >
            {f.label} {f.count}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty">タスクなし</div>
      ) : activeFile === 'backlog' ? (
        <div className="todo-cols">
          {TIER_META.map((t) => {
            const col = items.filter((i) => i.tier === t.key);
            return (
              <div className="todo-col" key={t.key}>
                <h3>
                  {t.label}
                  <span className="badge neutral">{col.length}</span>
                </h3>
                {col.map((c) => (
                  <Card key={c.path + c.line} c={c} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid cols-2">
          {items.map((c) => (
            <Card key={c.path + c.line} c={c} />
          ))}
        </div>
      )}
    </>
  );
}
