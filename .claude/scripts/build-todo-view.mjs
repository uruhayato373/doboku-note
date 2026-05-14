/**
 * task-queue.json から docs/project/TODO.md（人間用ビュー）を生成する。
 *
 * TODO.md は生成物。直接編集せず、タスクの追加・更新は task-queue.json
 * （または .claude/scripts/lib/task-queue.mjs の CLI）で行い、本スクリプトで再生成する。
 *
 * CLI: node .claude/scripts/build-todo-view.mjs  /  npm run build-todo
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, '.claude', 'state', 'task-queue.json');
const OUT_PATH = path.join(ROOT, 'docs', 'project', 'TODO.md');

const STATUS_LABEL = { todo: '未着手', in_progress: '進行中', blocked: 'ブロック' };
const PRIORITY_ORDER = { high: 0, mid: 1, low: 2 };

/** task-queue.json から TODO.md を生成し、{ open, done } を返す */
export function buildTodoView() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const open = queue.tasks.filter((t) => t.status !== 'done');
  const done = queue.tasks.filter((t) => t.status === 'done');

  const byCategory = {};
  for (const t of open) (byCategory[t.category || 'meta'] ??= []).push(t);

  const lines = [];
  lines.push('# TODO');
  lines.push('');
  lines.push(
    '> **生成物・直接編集禁止**。タスクの追加・更新は `.claude/state/task-queue.json`（または `.claude/scripts/lib/task-queue.mjs` の CLI）で行い、`npm run build-todo` で再生成する。スキーマと運用は [information-architecture.md](../../.claude/reference/information-architecture.md) 参照。',
  );
  lines.push('');
  lines.push(`- 生成: ${new Date().toISOString()}`);
  lines.push(`- 未完了: ${open.length} 件 / 完了済み: ${done.length} 件`);
  lines.push('');

  if (open.length === 0) {
    lines.push('未完了タスクはありません。');
    lines.push('');
  } else {
    for (const cat of Object.keys(byCategory).sort()) {
      const tasks = byCategory[cat].sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
      );
      lines.push(`## ${cat}`);
      lines.push('');
      lines.push('| ID | 状態 | 優先 | タイトル | 関連 |');
      lines.push('|---|---|---|---|---|');
      for (const t of tasks) {
        const status = STATUS_LABEL[t.status] || t.status;
        const refs = (t.refs || []).join(' / ') || '—';
        const parent = t.parent ? `（親: ${t.parent}）` : '';
        lines.push(
          `| ${t.id} | ${status} | ${t.priority || '—'} | ${t.title}${parent} | ${refs} |`,
        );
      }
      lines.push('');
    }
  }

  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  return { open: open.length, done: done.length };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const r = buildTodoView();
  console.log(`docs/project/TODO.md 生成: 未完了 ${r.open} 件 / 完了 ${r.done} 件`);
}
