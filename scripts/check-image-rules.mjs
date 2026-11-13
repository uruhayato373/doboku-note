#!/usr/bin/env node
/**
 * check-image-rules.mjs — AI 画像の経路と共通ルールの一本化を検査する。
 * codex-image.mjs を使うコードが config/image-generation.json の routes に全部あり、
 * 入口が実在し、先生の特徴の文を設定の外のコードへ書いていないこと。codex を codex-image.mjs の外から直接起動していないこと
 * （サイトの src と管理画面も走査する・DN-1015）。
 * exit: 0 合格 / 1 違反 / 2 検査不成立（走査 0 件）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listFiles } from './lib/fs-walk.mjs';
import { loadImageRules, routeViolations } from './lib/image-rules.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const SELF = new Set(['scripts/lib/codex-image.mjs', 'scripts/lib/image-rules.mjs', 'scripts/check-image-rules.mjs']);
const rules = loadImageRules(ROOT);
const files = ['scripts', '.claude/scripts', '.claude/skills', 'src', 'tools/admin-app/src']
  .flatMap((dir) => listFiles(join(ROOT, dir), { match: (path) => /\.(?:mjs|cjs|js|ts|tsx)$/.test(path), allowMissing: true }))
  .map((path) => relative(ROOT, path)).filter((file) => !SELF.has(file));
const { callers, errors } = routeViolations(files, (f) => readFileSync(join(ROOT, f), 'utf8'), rules.routes, (f) => existsSync(join(ROOT, f)));
console.log(`check-image-rules: コード ${files.length} 件を走査 / Codex の呼び出し元 ${callers} 件 / 経路 ${rules.routes.length} 件`);
if (!files.length || !callers) { console.error('検査不成立: 走査の対象が 0 件'); process.exit(2); }
for (const error of errors) console.error(`FAIL: ${error}`);
if (errors.length) process.exit(1);
console.log('PASS: 経路の登録と共通ルールの一本化');
