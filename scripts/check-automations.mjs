#!/usr/bin/env node
/**
 * check-automations.mjs — 自動化の台帳（config/automations.json）と実物が一致しているかの CI ゲート（DN-0817）。
 * ---------------------------------------------------------------------------
 * なぜ要るか: 2026-10-24 の棚卸しで、ログインが要る処理が Mac の launchd 6 本・CI 3 本・Windows のタスクに散らばり、
 * 毎週どこかが壊れていたのに、一覧は人が読む文書（docs/operations/04_自動化マップ.md）だけで、実物と食い違っていた
 * （載っていないワークフロー 10 本・止めたはずのものが稼働中など）。台帳を 1 本にし、実物との食い違いを止める。
 *
 * 見ること（結果はリポジトリの差分だけで決まるので ci:true）:
 *   1. .github/workflows/*.yml と scripts/scheduled/*.plist.tmpl のどれもが台帳に 1 行ずつあり、台帳の行の実物がある
 *   2. ワークフローの起動条件（on のキー）と cron が台帳の triggers・schedule と一致する
 *   3. plist の StartCalendarInterval（曜日・時・分）が台帳の schedule と一致する
 *   4. GitHub Actions の行は login が空（CI はログインしない）、Mac の行の login は playwright-auth-profiles.json のサービス
 *   5. readers の quality-audit:<id> が実在の検査、admin:/<path> が管理画面に実在、writes がデータセットの台帳に実在
 *
 * 使い方: npm run check-automations [-- --json]
 * exit: 0 = 一致 / 1 = 食い違いがある / 2 = 検査対象が 0 件（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

import { DATASETS, datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { CHECKS } from './quality-audit.mjs';

const TAG = '[check-automations]';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** plist の StartCalendarInterval を台帳の書き方（「土 09:30」「毎日 04:17」）にする（pure）。読めなければ null */
export function plistSchedule(text) {
  const block = /<key>StartCalendarInterval<\/key>\s*<dict>([\s\S]*?)<\/dict>/.exec(text)?.[1];
  if (!block) return null;
  const num = (key) => { const m = new RegExp(`<key>${key}</key>\\s*<integer>(\\d+)</integer>`).exec(block); return m ? Number(m[1]) : null; };
  const hour = num('Hour'); const minute = num('Minute'); const weekday = num('Weekday');
  if (hour === null || minute === null) return null;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return weekday === null ? `毎日 ${time}` : `${WEEKDAYS[weekday % 7]} ${time}`;
}

/** ワークフローの on を { triggers, crons } にする（pure） */
export function workflowTriggers(doc) {
  const on = doc?.on ?? doc?.[true] ?? {};
  const triggers = typeof on === 'string' ? [on] : Array.isArray(on) ? on : Object.keys(on);
  const crons = (on?.schedule ?? []).map((s) => s.cron);
  return { triggers, crons };
}

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/** 台帳と実物の食い違いを文の配列で返す（root を差し替えればテストできる） */
export function checkAutomations({ root = REPO_ROOT, ledger, checkIds, datasetIds, authServices }) {
  const problems = [];
  const entries = ledger.automations;
  const bySource = new Map(entries.map((e) => [e.source, e]));
  const wfDir = join(root, '.github', 'workflows');
  const workflows = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).map((f) => `.github/workflows/${f}`) : [];
  const schedDir = join(root, 'scripts', 'scheduled');
  const plists = existsSync(schedDir) ? readdirSync(schedDir).filter((f) => f.endsWith('.plist.tmpl')).map((f) => `scripts/scheduled/${f}`) : [];

  for (const src of [...workflows, ...plists]) if (!bySource.has(src)) problems.push(`${src} が台帳に無い（${datasetPath('config.automations')} に読み手つきで足すか、要らなければ消す）`);
  for (const e of entries) {
    const abs = join(root, e.source);
    if (!existsSync(abs)) { problems.push(`${e.id}: 実物 ${e.source} が無い（消したなら台帳からも消す）`); continue; }
    const text = readFileSync(abs, 'utf8');
    if (e.runner === 'github-actions') {
      if (!e.source.startsWith('.github/workflows/')) problems.push(`${e.id}: runner と source が合わない`);
      let doc;
      try { doc = yaml.load(text); } catch (err) { problems.push(`${e.id}: YAML を読めない（${err.message.split('\n')[0]}）`); continue; }
      const { triggers, crons } = workflowTriggers(doc);
      if (!sameSet(triggers, e.triggers)) problems.push(`${e.id}: 起動条件が違う（実物 ${triggers.join(',')} / 台帳 ${e.triggers.join(',')}）`);
      if (!sameSet(crons, e.schedule)) problems.push(`${e.id}: cron が違う（実物 ${crons.join(' | ') || 'なし'} / 台帳 ${e.schedule.join(' | ') || 'なし'}）`);
      if (e.login.length) problems.push(`${e.id}: GitHub Actions はログインしない（login を空にし、ログインの要る処理は土曜の Mac の収集 weekly-collect へ）`);
    } else {
      if (!e.source.startsWith('scripts/scheduled/')) problems.push(`${e.id}: runner と source が合わない`);
      const sched = plistSchedule(text);
      if (!sched || !sameSet([sched], e.schedule)) problems.push(`${e.id}: launchd の時刻が違う（実物 ${sched ?? '読めない'} / 台帳 ${e.schedule.join(' | ')}）`);
      for (const s of e.login) if (!authServices.has(s)) problems.push(`${e.id}: login の ${s} が playwright-auth-profiles.json のサービスに無い`);
    }
    for (const r of e.readers) {
      const [kind, value] = r.includes(':') ? [r.slice(0, r.indexOf(':')), r.slice(r.indexOf(':') + 1)] : [r, ''];
      if (kind === 'quality-audit' && !checkIds.has(value)) problems.push(`${e.id}: 読み手 ${r} が quality-audit に無い`);
      if (kind === 'admin' && !existsSync(join(root, 'tools', 'admin-app', 'src', 'app', value, 'page.tsx'))) problems.push(`${e.id}: 読み手 ${r} の画面が管理画面に無い`);
    }
    for (const w of e.writes ?? []) if (!datasetIds.has(w)) problems.push(`${e.id}: writes の ${w} がデータセットの台帳に無い`);
  }
  return { problems, inspected: { entries: entries.length, workflows: workflows.length, plists: plists.length } };
}

function main() {
  const json = process.argv.includes('--json');
  const ledger = readDataset(REPO_ROOT, 'config.automations');
  const auth = JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'config', 'playwright-auth-profiles.json'), 'utf8'));
  const r = checkAutomations({
    ledger,
    checkIds: new Set(CHECKS.map((c) => c.id)),
    datasetIds: new Set(DATASETS.map((d) => d.id)),
    authServices: new Set(Object.keys(auth.services ?? {})),
  });
  const { entries, workflows, plists } = r.inspected;
  if (json) console.log(JSON.stringify({ ...r, ledger: datasetPath('config.automations') }, null, 2));
  else {
    console.log(`${TAG} 台帳 ${entries} 行 / ワークフロー ${workflows} 本・launchd ${plists} 本を実物と照合 / 食い違い ${r.problems.length} 件`);
    for (const p of r.problems) console.log(`  ✗ ${p}`);
    if (!r.problems.length && entries) console.log(`${TAG} ✓ 台帳と実物は一致（CI はログインしない）`);
  }
  if (!entries || workflows + plists === 0) { console.error(`${TAG} 検査対象が 0 件（検査不成立）`); process.exit(2); }
  process.exit(r.problems.length ? 1 : 0);
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('scripts/check-automations.mjs')) main();
