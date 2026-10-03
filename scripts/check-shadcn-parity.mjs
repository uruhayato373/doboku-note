#!/usr/bin/env node
/**
 * check-shadcn-parity.mjs — 管理画面の UI 部品が shadcn/ui 公式と同じクラスかを検査する
 * ---------------------------------------------------------------------------
 * なぜ必要か（DN-0432）:
 *   shadcn の部品を「互換」として手で書いたところ、Badge に標準に無い行の高さ（text-[11px] leading-5）が入り、
 *   上下の余白が大きく見えていた（2026-09-28）。他の部品も余白・角丸・フォーカス表示が少しずつ公式とずれていた。
 *   部品は公式のソースを基準にし、意図した差だけを理由付きで許す。
 *
 * 比べるもの:
 *   tools/admin-app/src/components/ui/<name>.tsx と .claude/config/shadcn-reference/<name>.tsx（公式の保存物）を、
 *   scripts/lib/shadcn-parity.mjs で「data-slot ごと・cva の base / variant ごと」のクラス集合にして比べる。
 *
 * 落とすもの（exit 1）:
 *   - 例外（.claude/config/shadcn-parity-allow.json）に無いクラスの過不足・部品単位の過不足
 *   - 例外に書いたのに、もう差が無い／内容が違う行（古い例外を残さない）
 *   - 公式の参照が無い部品（新しい部品は sync-shadcn-reference で参照を取ってから作る）
 *   - ページ側（tools/admin-app/src の ui 以外）で Badge・Button・TabsTrigger の大きさ（文字サイズ・行の高さ・
 *     高さ・余白）を className で上書きしているもの。大きさは variant / size で選ぶ（今回の不具合はここから入った）
 * 検査不成立（exit 2）: 部品が 1 本も無い・参照ディレクトリが無い。
 * 公式の更新を取り込むときは node scripts/sync-shadcn-reference.mjs で参照を取り直し、差分を部品へ反映する。
 *
 * 使い方: node scripts/check-shadcn-parity.mjs [--json]
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { diffEntities, extractEntities } from './lib/shadcn-parity.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const UI_DIR = join(ROOT, 'tools/admin-app/src/components/ui');
const APP_SRC = join(ROOT, 'tools/admin-app/src');
const REF_DIR = join(ROOT, '.claude/config/shadcn-reference');
const ALLOW = join(ROOT, '.claude/config/shadcn-parity-allow.json');
const TAG = '[check-shadcn-parity]';

const sameSet = (a = [], b = []) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/** 大きさを決めるクラス（variant / size の役目）。md:h-12 のような接頭辞付きも見る。 */
const SIZE_OVERRIDE = /^(text-(xs|sm|base|lg|\d?xl|\[[^\]]+\])|leading-\S+|h-\S+|min-h-\S+|p[xytblr]?-\S+|size-\S+)$/;
const SIZED = ['Badge', 'Button', 'TabsTrigger'];
const RE_SIZED = new RegExp(`<(${SIZED.join('|')})\\b[^>]*?className=(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`, 'g');

/** ページのソースから、大きさを上書きしている Badge・Button・TabsTrigger を拾う（テストから使う純関数）。 */
export function findSizeOverrides(src) {
  const text = String(src);
  const out = [];
  for (const m of text.matchAll(RE_SIZED)) {
    const bad = (m[2] ?? m[3] ?? m[4] ?? '').split(/\s+/).filter((t) => SIZE_OVERRIDE.test(t.replace(/^(?:[\w-]+:)+/, '')));
    if (bad.length) out.push({ component: m[1], classes: bad, line: text.slice(0, m.index).split(/\r?\n/).length });
  }
  return out;
}

/** 1 部品の差分を例外と照らす（テストから使う純関数）。 */
export function judge(diffs, allow = {}) {
  const violations = [];
  const stale = [];
  for (const d of diffs) {
    const a = allow[d.entity];
    if (!a || !sameSet(a.extra, d.extra) || !sameSet(a.missing, d.missing)) violations.push(d);
  }
  for (const entity of Object.keys(allow)) {
    if (!diffs.some((x) => x.entity === entity)) stale.push({ entity, reason: '登録した差がもう無い（公式と同じになった）' });
  }
  return { violations, stale };
}

function walkTsx(dir, skip) {
  const out = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) {
      if (p !== skip) out.push(...walkTsx(p, skip));
    } else if (f.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function main() {
  const json = process.argv.includes('--json');
  if (!existsSync(UI_DIR) || !existsSync(REF_DIR)) {
    console.error(`${TAG} 検査不成立: ${existsSync(UI_DIR) ? '参照ディレクトリ' : '部品ディレクトリ'}が無い`);
    return 2;
  }
  const names = readdirSync(UI_DIR).filter((f) => f.endsWith('.tsx')).map((f) => f.replace(/\.tsx$/, '')).sort();
  if (!names.length) {
    console.error(`${TAG} 検査不成立: 部品が 1 本も無い`);
    return 2;
  }
  const allowAll = existsSync(ALLOW) ? JSON.parse(readFileSync(ALLOW, 'utf8')).components ?? {} : {};
  const results = [];
  for (const name of names) {
    const refPath = join(REF_DIR, `${name}.tsx`);
    if (!existsSync(refPath)) {
      results.push({ name, noReference: true, violations: [], stale: [], entities: 0 });
      continue;
    }
    const ref = extractEntities(readFileSync(refPath, 'utf8'));
    const ours = extractEntities(readFileSync(join(UI_DIR, `${name}.tsx`), 'utf8'));
    results.push({ name, entities: Object.keys(ref).length, ...judge(diffEntities(ref, ours), allowAll[name]) });
  }
  for (const name of Object.keys(allowAll)) {
    if (!names.includes(name)) results.push({ name, entities: 0, violations: [], stale: [{ entity: '*', reason: '部品が無いのに例外が残っている' }] });
  }
  const pages = walkTsx(APP_SRC, UI_DIR);
  const overrides = pages.flatMap((p) => findSizeOverrides(readFileSync(p, 'utf8')).map((o) => ({ file: relative(ROOT, p).split(sep).join('/'), ...o })));

  const bad = results.filter((r) => r.noReference || r.violations.length || r.stale.length);
  const entities = results.reduce((n, r) => n + r.entities, 0);
  const allowCount = Object.values(allowAll).reduce((n, a) => n + Object.keys(a).length, 0);
  if (json) {
    console.log(JSON.stringify({ components: names.length, entities, pages: pages.length, results, overrides }, null, 2));
  } else {
    console.log(`${TAG} 部品 ${names.length} 本・公式の単位 ${entities} 件、ページ ${pages.length} 本を実検査`);
    for (const r of bad) {
      if (r.noReference) console.log(`  ✗ ${r.name}: 公式の参照が無い（node scripts/sync-shadcn-reference.mjs ${r.name} で取る）`);
      for (const v of r.violations) {
        const where = v.kind === 'entity-missing' ? '（公式の部品単位が無い）' : v.kind === 'entity-extra' ? '（公式に無い部品単位）' : '';
        const parts = [v.missing.length && `公式にあって無い: ${v.missing.join(' ')}`, v.extra.length && `公式に無い: ${v.extra.join(' ')}`].filter(Boolean).join(' / ');
        console.log(`  ✗ ${r.name} ${v.entity}${where}: ${parts}`);
      }
      for (const s of r.stale) console.log(`  ✗ ${r.name} ${s.entity}: 例外が古い — ${s.reason}（shadcn-parity-allow.json から消す）`);
    }
    for (const o of overrides) console.log(`  ✗ ${o.file}:${o.line} <${o.component}> の大きさを className で上書きしている: ${o.classes.join(' ')}（variant / size で選ぶ）`);
    console.log(
      bad.length || overrides.length
        ? `${TAG} 公式のクラスに戻すか、理由があれば .claude/config/shadcn-parity-allow.json に登録する`
        : `${TAG} ✓ すべて公式どおり（例外 ${allowCount} 件は理由付き）・ページでの大きさの上書き 0 件`,
    );
  }
  return bad.length || overrides.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
