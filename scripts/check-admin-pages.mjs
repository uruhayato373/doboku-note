#!/usr/bin/env node
/**
 * 管理画面の画面が増え続けないように、全ルートと台帳 config/admin-pages.json を照合する（外部通信なし）。
 * 台帳に無い画面・台帳だけに残る画面・問いの無い画面・同じ問いの画面・上限超えを止める。
 * exit: 0 違反なし / 1 違反あり / 2 検査不成立（ルート 0 件）
 */
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { auditAdminPages } from './lib/admin-pages.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const APP = join(REPO_ROOT, 'tools/admin-app/src/app');
const routes = listFiles(APP, { ext: '.tsx' }).concat(listFiles(APP, { ext: '.ts' })).filter((f) => /\/(page\.tsx|route\.ts)$/.test(f.split(sep).join('/'))).map((f) => {
  const rel = relative(APP, f).split(sep).join('/');
  return { route: `/${rel.replace(/\/?(page\.tsx|route\.ts)$/, '')}`, redirects: /\bredirect\(/.test(readFileSync(f, 'utf8')) };
});
const { errors, counted } = auditAdminPages(readDataset(REPO_ROOT, 'config.admin-pages'), routes);
console.log(`check-admin-pages: ルート ${routes.length} 本 / 画面 ${counted} 本 / 違反 ${errors.length} 件`);
for (const line of errors) console.error(`  違反: ${line}`);
if (routes.length === 0) process.exitCode = 2;
else if (errors.length) process.exitCode = 1;
