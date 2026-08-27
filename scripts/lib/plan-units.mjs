/**
 * plan-units.mjs — .claude/plans/ の unit 発見（命名規則の唯一の実装）
 * unit は「DN-#### で始まるディレクトリ（00-master.md、無ければ 00-*.md で代用）」か
 * 「DN-####-slug.md 単一ファイル」。
 * check-task-plan-links.mjs と todo-complete.mjs と admin todo.ts が共用する
 * （命名規則の二重実装を作らない）。
 *
 * master 候補のフォールバック（00-master.md 優先・無ければ 00-*.md）は既存の
 * check-task-plan-links.mjs discoverPlanUnits() の挙動をそのまま踏襲する。
 * 歴史的実例（2026-08-27 企画SSOTへ撤収済み）: DN-0092-pe-construction-subject-packs/ は
 * 00-master.md ではなく 00-product-plan.md を持っていた（2026-08-26 確認）。フォールバック仕様
 * 自体は将来 unit のために維持する（落とすと missing-master 誤検知になる）。
 */
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const UNIT_RE = /^(DN-\d{4})/;

/** dir 内の master 候補ファイル名を返す（00-master.md 優先、無ければ 00-*.md、どちらも無ければ null）。 */
function findMasterName(dirAbs) {
  const files = readdirSync(dirAbs).filter((f) => f.endsWith('.md'));
  if (files.includes('00-master.md')) return '00-master.md';
  return files.find((f) => /^00-/.test(f)) || null;
}

/** @returns {Array<{taskId:string, name:string, path:string, type:'dir'|'file', masterPath:string|null}>} */
export function listPlanUnits(rootDir) {
  const plansDir = join(rootDir, '.claude/plans');
  if (!existsSync(plansDir)) return [];
  const out = [];
  for (const name of readdirSync(plansDir)) {
    const m = name.match(UNIT_RE);
    if (!m) continue;
    const p = join(plansDir, name);
    const isDir = statSync(p).isDirectory();
    if (!isDir && !name.endsWith('.md')) continue;
    const masterName = isDir ? findMasterName(p) : name;
    out.push({
      taskId: m[1],
      name,
      path: `.claude/plans/${name}`,
      type: isDir ? 'dir' : 'file',
      masterPath: isDir ? (masterName ? `.claude/plans/${name}/${masterName}` : null) : `.claude/plans/${name}`,
    });
  }
  return out;
}
