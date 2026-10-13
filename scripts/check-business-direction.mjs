#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { direction, records, validateRecord, buildReport, hash, strategyForRecord, RECORDS } from './lib/business-direction.mjs';
import { REPO_ROOT, resolveMovedPath } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
// process.argv / process.exit / process.exitCode は runBody が渡す __argv / __exit / __status への読み替え。
// 本文は字下げしていない（複数行の文字列を壊さないため）。CLI として起動したときの引数・出力・終了コードは従来と同じ。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit, status: __status }) => {
try {
  const root = REPO_ROOT, config = direction(root), rows = records(root);
  const errors = [];
  for (const r of rows) {
    if (r.kind === 'snapshot') {
      if (!r.strategy || hash(r.strategy) !== r.strategyHash || !Array.isArray(r.cells) || r.cells.length === 0) errors.push(`${r.file}: snapshot invalid`);
      for (const c of r.cells ?? []) if (c.value != null && (!Number.isFinite(c.value) || c.value < 0)) errors.push(`${r.file}: metric invalid`);
      for (const s of r.sources ?? []) if (!existsSync(join(root, resolveMovedPath(s.file).split('#')[0])) || !/^[a-f0-9]{64}$/.test(s.sha256)) errors.push(`${r.file}: source missing`);
    } else {
      const before = rows.filter(x => x.createdAt < r.createdAt || (x.createdAt === r.createdAt && x.file !== r.file));
      try { validateRecord(r, strategyForRecord(r, rows, config), before, new Date(r.createdAt)); } catch (e) { errors.push(`${r.file}: ${e.message}`); }
    }
  }
  const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
  const normalizeEol = s => s.split(String.fromCharCode(13)).join('');
  const changes = git(['diff', ...(__argv.includes('--staged') ? ['--cached'] : ['HEAD']), '--name-only', '--no-renames', '-z', '--', RECORDS]).split('\0').filter(Boolean);
  if (__argv.includes('--staged')) {
    const stagedPaths = [...changes, datasetPath('config.business-direction'), datasetPath('config.seo-watchwords')];
    for (const f of stagedPaths) {
      // autocrlf の端末では index=LF / 作業ツリー=CRLF になるので改行を正規化してから比較する（Windows で常に FAIL する偽赤の再発防止・2026-09-14）
      try { if (normalizeEol(git(['show', `:${f}`])) !== normalizeEol(readFileSync(f, 'utf8'))) errors.push(`${f}: stagedと作業ツリーを揃えて検査してください`); }
      catch { errors.push(`${f}: stagedから検査できません`); }
    }
  }
  const old = new Set(git(['ls-tree','-r','--name-only','HEAD',RECORDS]).trim().split('\n'));
  for (const f of changes) if (old.has(f)) errors.push(`${f}: 過去記録は変更・削除できません。訂正を追記してください`);
  const watch = readDataset(root, 'config.seo-watchwords');
  if (watch.strategy.focusSource !== datasetPath('config.business-direction') || watch.strategy.focusQualifications) errors.push('SEOの重点資格はbusiness-directionだけを参照してください');
  const experiments = readDataset(root, 'business.experiments').experiments;
  for (const e of experiments.filter(e => e.businessContext)) {
    const b = e.businessContext;
    if (!['all', ...config.qualifications.map(q => q.id)].includes(b.qualification) || !config.metrics.some(m => m.id === b.metricId) || !b.readerNeed?.trim() || !b.verifiedGap?.trim() || !rows.some(r => r.kind === 'review' && r.file === resolveMovedPath(b.reviewRecord))) errors.push(`${e.id}: businessContextの資格・指標・レビュー参照を確認してください`);
  }
  const report = buildReport(root);
  const applicable = report.cells.filter(c => c.applicable !== false);
  console.log(`[business-direction] ${errors.length ? 'FAIL' : 'PASS'}: ${config.qualifications.length}資格 / ${config.metrics.length}指標 / ${rows.length}履歴。計測 ${applicable.filter(c => c.value != null).length}/${applicable.length}（対象外 ${report.cells.length - applicable.length}）`);
  for (const e of errors) console.error(e);
  if (errors.length) __status.code = 1;
} catch (e) { console.error(`[business-direction] FAIL: ${e.message}`); __status.code = 1; }
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
