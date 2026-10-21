/**
 * 管理画面（tools/admin-app）の tsc が quality-audit の ci ゲートに載っていて、実際に 0 件で通ることを固定する（DN-0660）。
 * 背景: ルートの type-check は管理画面を含まず、content-items.ts の 2 件の型エラーがどの CI にも検査されないまま残っていた。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('quality-audit に管理画面の tsc が ci:true の束（admin-ui）で載り、npm script が管理画面の tsconfig を指す', () => {
  // 2026-10-21 に管理画面の 3 検査を admin-ui の束（steps）にまとめた（DN-0805）。束が ci:true で、その手順に tsc がある
  const src = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');
  const lines = src.split('\n');
  const bundle = lines.find((l) => l.includes("id: 'admin-ui'"));
  assert.ok(bundle, 'admin-ui の束が無い');
  assert.match(bundle, /ci: true/);
  const row = lines.find((l) => l.includes("label: 'type-check-admin'"));
  assert.ok(row, 'admin-ui の束に type-check-admin の手順が無い');
  assert.match(row, /npm: 'type-check:admin'/);
  assert.match(row, /timeout: \d/);
  assert.match(row, /note: /);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['type-check:admin'], /tsc --noEmit -p tools\/admin-app\/tsconfig\.json/);
});

test('管理画面の tsc が 0 件で通る（content-items.ts の listView / workView の戻り値型）', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', join(ROOT, 'tools/admin-app/tsconfig.json')], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
});
