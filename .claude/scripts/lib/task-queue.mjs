/**
 * task-queue.json の読み書きヘルパ。
 *
 * doboku-note の全タスクの単一正源（旧 GitHub Issue の置換）。
 * スキーマ・運用ルールは .claude/reference/information-architecture.md を参照。
 *
 * ライブラリとして:
 *   import { readQueue, addTask, updateTask } from '#lib/task-queue.mjs'
 *
 * CLI として:
 *   node .claude/scripts/lib/task-queue.mjs add --title "..." --category infra \
 *        [--priority high] [--source ci:psi-audit] [--dedupe-key k] [--parent T-001] \
 *        [--refs a.md,b.md] [--notes "..."]
 *   node .claude/scripts/lib/task-queue.mjs update T-001 --status done [--notes "..."]
 *
 * CLI でタスクを変更したら `npm run build-todo` で docs/project/TODO.md を再生成すること。
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, '.claude', 'state', 'task-queue.json');

/** task-queue.json を読む（無ければ空のキューを返す） */
export function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    return { meta: { schema: 1, updated_at: new Date().toISOString() }, tasks: [] };
  }
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

/** task-queue.json を書く（meta.updated_at を更新） */
export function writeQueue(queue) {
  queue.meta = queue.meta || { schema: 1 };
  queue.meta.updated_at = new Date().toISOString();
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');
}

/** 次の連番 ID（T-NNN）を計算する */
export function nextId(queue) {
  let max = 0;
  for (const t of queue.tasks) {
    const m = /^T-(\d+)$/.exec(t.id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `T-${String(max + 1).padStart(3, '0')}`;
}

/**
 * タスクを追加する。
 * dedupe_key が指定され、同じ key の未完了タスクが既にあれば追加せず、
 * 既存タスクの updated（と notes）を更新する（CI の重複起票防止）。
 * @returns {{ task: object, created: boolean }}
 */
export function addTask(fields) {
  const queue = readQueue();
  const today = new Date().toISOString().slice(0, 10);

  if (fields.dedupe_key) {
    const existing = queue.tasks.find(
      (t) => t.dedupe_key === fields.dedupe_key && t.status !== 'done',
    );
    if (existing) {
      existing.updated = today;
      if (fields.notes) existing.notes = fields.notes;
      writeQueue(queue);
      return { task: existing, created: false };
    }
  }

  const task = {
    id: nextId(queue),
    title: fields.title,
    status: fields.status || 'todo',
    category: fields.category || 'meta',
    priority: fields.priority || 'mid',
    source: fields.source || 'manual',
    parent: fields.parent || null,
    refs: fields.refs || [],
    dedupe_key: fields.dedupe_key || null,
    created: today,
    updated: today,
    notes: fields.notes || '',
  };
  queue.tasks.push(task);
  writeQueue(queue);
  return { task, created: true };
}

/** 既存タスクを部分更新する（updated を自動更新） */
export function updateTask(id, patch) {
  const queue = readQueue();
  const task = queue.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`task not found: ${id}`);
  Object.assign(task, patch);
  task.updated = new Date().toISOString().slice(0, 10);
  writeQueue(queue);
  return task;
}

// --- CLI ---

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const key = args[i].slice(2).replace(/-/g, '_');
    const hasValue = args[i + 1] !== undefined && !args[i + 1].startsWith('--');
    flags[key] = hasValue ? args[++i] : true;
  }
  return flags;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'add') {
    const f = parseFlags(rest);
    if (!f.title) {
      console.error('error: --title is required');
      process.exit(1);
    }
    const { task, created } = addTask({
      title: f.title,
      category: f.category,
      priority: f.priority,
      source: f.source,
      parent: f.parent,
      dedupe_key: f.dedupe_key,
      notes: f.notes,
      refs: typeof f.refs === 'string' ? f.refs.split(',') : undefined,
    });
    console.log(`${created ? 'added' : 'deduped (updated existing)'}: ${task.id} — ${task.title}`);
  } else if (cmd === 'update') {
    const id = rest[0];
    if (!id) {
      console.error('error: task id is required');
      process.exit(1);
    }
    const task = updateTask(id, parseFlags(rest.slice(1)));
    console.log(`updated: ${task.id} — status=${task.status}`);
  } else {
    console.error('usage:');
    console.error('  task-queue.mjs add --title "..." [--category --priority --source --dedupe-key --parent --refs --notes]');
    console.error('  task-queue.mjs update <id> [--status --priority --notes ...]');
    process.exit(1);
  }
}
