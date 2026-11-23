/**
 * 管理画面（tools/admin-app）の tsc が quality-audit の ci ゲートに載っていて、CI で回り続けることを固定する（DN-0660）。
 * 背景: ルートの type-check は管理画面を含まず、content-items.ts の 2 件の型エラーがどの CI にも検査されないまま残っていた。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('quality-audit に管理画面の tsc が ci:true の束（admin-ui）で載り、npm script が管理画面の tsconfig を指す', () => {
  // 2026-10-21 に管理画面の 3 検査を admin-ui の束（steps）にまとめた（DN-0805）。束が ci:true で、その手順に tsc がある
  const src = readFileSync(join(ROOT, 'scripts/ops/quality-audit.mjs'), 'utf8');
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

// 管理画面の tsc 自体の実行はここでは回さない（約 6 秒）。上のテストが「admin-ui の束が ci:true で type-check:admin を回す」ことを固定し、CI の audit ジョブが実際に tsc を回す。
