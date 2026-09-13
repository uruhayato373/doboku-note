#!/usr/bin/env node
/** CI adapter: deterministic selection / bounded model output / existing append-only ledgers. */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { report, readWatchConfig, readJson, LEDGER, HISTORY, KIND, hash, dateJst, statusOf, latestMeasurement, readMeasurements, recordAction, updateLedger, decisionRecord, writeDecision } from './lib/seo-rank-watch.mjs';
import { validateAgentResult, applyReplacements, waitingReason } from './lib/seo-rank-watch-ci.mjs';

const root = process.cwd(), args = process.argv.slice(2), command = args[0];
const dirArg = args.indexOf('--dir');
const dir = resolve(dirArg >= 0 && args[dirArg + 1] ? args[dirArg + 1] : '.tmp/seo-rank-watch-ci');
const json = file => JSON.parse(readFileSync(join(dir, file), 'utf8'));
const save = (file, value) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, file), JSON.stringify(value, null, 2) + '\n'); };
const run = (file, argv = []) => execFileSync(process.execPath, [file, ...argv], { cwd: root, stdio: 'inherit' });
const git = argv => execFileSync('git', argv, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function output(key, value) { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`); }

async function main() {
  if (!['prepare', 'apply', 'deployments', 'persist', 'summary'].includes(command) || dirArg < 0 || !args[dirArg + 1] || args[dirArg + 1].startsWith('--')) throw Error('seo-rank-watch-ci <prepare|apply|deployments|persist|summary> --dir PATH');
  if (command === 'deployments') {
    const pending = readJson(root, LEDGER).experiments.filter(e => e.kind === KIND && statusOf(e) === 'pending-deploy');
    if (!pending.length) { console.log('本番反映待ち0件。観察開始の照合対象なし。'); return; }
    const repo = process.env.GITHUB_REPOSITORY;
    if (repo !== 'uruhayato373/doboku-note') throw Error('Unexpected repository');
    const response = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/actions/workflows/cloudflare-deploy.yml/runs?branch=main&status=success&per_page=1`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const proof = response.workflow_runs?.[0];
    if (!proof) { console.log('成功した本番反映が無いため観察開始を待機。'); return; }
    if (!/^[a-f0-9]{40}$/.test(proof.head_sha)) throw Error('Invalid production commit');
    git(['fetch', '--depth=1', 'origin', proof.head_sha]);
    for (const exp of pending) {
      let deployed;
      try { deployed = execFileSync('git', ['show', `${proof.head_sha}:${exp.scope.contentPath}`], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch { throw Error('Production content could not be inspected'); }
      if (hash(deployed) !== exp.actions.at(-1).contentHash) { console.log(`${exp.watchId}: 本番は改善前または別内容。観察開始を待機。`); continue; }
      run('scripts/seo-rank-watch.mjs', ['deploy', '--id', exp.watchId, '--run-id', String(proof.id), '--commit']);
    }
    return;
  }
  if (command === 'prepare') {
    const view = report(root);
    const context = { version: 1, date: dateJst(), configHash: view.configHash, ledgerHash: hash(readFileSync(join(root, LEDGER))), selected: view.selected, policyReviewDue: view.policyReviewDue,
      policyNextReviewDate: view.policyNextReviewDate, selectionOrder: view.selectionOrder, qualifications: view.qualifications, activeExperiments: view.activeExperiments,
      rows: view.rows.map(({ id, keyword, qualification, mode, status, current, previous, delta, fresh, reason, nextReviewDate, measurementFile }) => ({ id, keyword, qualification, mode, status, current, previous, delta, fresh, reason, nextReviewDate, measurementFile })),
      targetHash: view.selected ? hash(readFileSync(join(root, view.selected.contentPath))) : null };
    save('context.json', context);
    const needed = Boolean(view.selected || view.policyReviewDue);
    output('agent_needed', needed);
    if (!needed) save('result.json', { reason: waitingReason(view), policyReview: null, improvement: null });
    console.log(`候補 ${view.selected?.keyword ?? 'なし'} / 方針レビュー ${view.policyReviewDue} / 判断エージェント ${needed}`);
    return;
  }
  if (command === 'apply') {
    const context = json('context.json'), result = validateAgentResult(context, json('result.json'));
    const view = report(root);
    if (context.date !== dateJst() || context.configHash !== view.configHash || context.ledgerHash !== hash(readFileSync(join(root, LEDGER)))) throw Error('Prepared context changed; rerun from fresh measurements');
    if (result.improvement) {
      const edit = result.improvement, watch = view.selected;
      if (!watch || watch.id !== edit.watchId || !watch.contentPath.startsWith('content/site/') || !watch.contentPath.endsWith('.mdx')) throw Error('Selection changed or target is not an article');
      const full = join(root, watch.contentPath), { raw, eol } = readMdxFile(full);
      if (hash(raw) !== context.targetHash) throw Error('Article changed after selection');
      const changed = applyReplacements(raw, edit.replacements);
      const normalized = changed.replace(/\n/g, eol);
      const action = { ...edit.action, contentHash: hash(normalized) };
      const config = readWatchConfig(root), measurement = latestMeasurement(readMeasurements(root), watch);
      if (!measurement || action.contentHash === measurement.contentHash) throw Error('A measured baseline and actual article change are required');
      recordAction(structuredClone(readJson(root, LEDGER)), config, watch, action, measurement);
      writeMdxFile(full, changed, eol);
      try {
        run('.claude/scripts/validate-mdx.mjs', [watch.contentPath]);
        run('.claude/scripts/lint-frontmatter.mjs', [watch.contentPath]);
        run('.claude/scripts/lint-mdx-mobile.mjs', [watch.contentPath]);
      } catch (error) { writeMdxFile(full, raw, eol); throw error; }
      await updateLedger(root, store => recordAction(store, config, watch, action, measurement));
      save('applied.json', { watchId: watch.id, contentPath: watch.contentPath, needs: action.needs, done: action.done });
      output('improved', true);
    }
    if (result.policyReview) writeDecision(root, decisionRecord(report(root), result.policyReview, true));
    writeDecision(root, decisionRecord(report(root), result.reason));
    console.log('判断を追記。改善は本番反映確認後に7日観察へ移る。');
    return;
  }
  if (command === 'persist') {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'uruhayato373/doboku-note') throw Error('Persistence is restricted to this repository in GitHub Actions');
    if (git(['diff', '--cached', '--name-only'])) throw Error('Unexpected pre-staged changes');
    const changed = git(['diff', '--name-only']).split('\n').filter(Boolean);
    const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
    const allowedIndexes = new Set(['src/config/past-exam-backlinks.json', 'src/config/exam-question-keywords.json', 'src/config/cross-exam-keywords.json', 'src/config/tag-dictionary.json', 'src/config/keyword-relations.json', 'src/config/pillar-exam-questions.json']);
    const applied = existsSync(join(dir, 'applied.json')) ? json('applied.json') : null;
    const articles = changed.filter(p => p.startsWith('content/'));
    if (articles.length > 1 || articles.some(p => p !== applied?.contentPath) || (applied && articles.length !== 1)) throw Error('Article changes must match the single validated improvement');
    if (!applied && changed.some(p => allowedIndexes.has(p))) throw Error('Index changes require a validated article improvement');
    const files = [...new Set([...changed, ...untracked])].filter(p => p === LEDGER || p.startsWith(`${HISTORY}/`) || articles.includes(p) || allowedIndexes.has(p));
    for (const p of [...changed, ...untracked]) if (!files.includes(p)) throw Error(`Unexpected tracked output: ${p}`);
    if (!files.length) { console.log('保存差分0件。既存記録と同じ。'); return; }
    git(['add', '--', ...files]);
    run('scripts/check-seo-rank-watch.mjs', ['--staged']);
    git(['diff', '--cached', '--check']);
    git(['commit', '-m', `chore(seo): rank watch ${dateJst()} [skip ci]`]);
    // No force push: a conflicting human write fails visibly and is retried on the next run.
    git(['pull', '--rebase', 'origin', 'develop']);
    git(['push', 'origin', 'HEAD:develop']);
    return;
  }
  const view = report(root), lines = ['## SEO Rank Watch', '', `- 監視 ${view.rows.length}件 / 改善候補 ${view.selected?.keyword ?? 'なし'}`, `- ${waitingReason(view)}`, '', '| キーワード | 順位・前期差 | 状態・レビュー |', '|---|---|---|',
    ...view.rows.map(w => `| ${w.keyword.replace(/\|/g, '／')} | ${w.current?.rank?.toFixed(2) ?? '欠測'} / ${w.delta?.toFixed(2) ?? '比較不可'} | ${w.status} / ${w.nextReviewDate ?? '—'} |`)];
  try { const applied = json('applied.json'); lines.push('', `改善: ${applied.done}`, `検索ニーズ: ${applied.needs}`); } catch { /* No improvement is a normal outcome. */ }
  lines.push('', '効果は本番反映後の実測で判断する。');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}
main().catch(error => { console.error(`[seo-rank-watch-ci] ${error.message}`); process.exitCode = 1; });
