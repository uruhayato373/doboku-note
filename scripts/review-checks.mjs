#!/usr/bin/env node
/**
 * review-checks.mjs — 週次・月次レビューの点検を回ごとに実行し、開いている Issue と一緒に残す。
 * ---------------------------------------------------------------------------
 * 止めたい事故: 点検（check-*）が赤くても、automation-failure Issue が開いたままでも、
 *   レビューの手順にそれを読んで振り分ける段が無く、8/31 の workflow-health・8/6 の security bump が
 *   1 か月開いたままだった（2026-10-01 実査）。レビューが「実施できた」と言えるのは、
 *   失敗した点検と開いている Issue の全件に行き先（DN カード・定常・理由）を書いたときだけにする。
 *
 * 実行する点検は .claude/config/review-wiring.json の cadences.<id>.checks（読むだけのコマンド）。
 *   exit 0 → ok / 1 → fail（要対応）/ それ以外・時間切れ → broken（検査不成立）
 * Issue は gh issue list --state open（全ラベル）、依存の脆弱性は Dependabot の open alerts（パッケージ単位で振り分ける）。
 * 読めなければ issuesError / alertsError を残す（0 件と呼ばない）。
 *
 * 書くもの（--write）: data/metrics/business/checks-<cadence>-<runKey>-<実行時刻>.json
 *   （事業の記録と同じく追記だけ。取り直すと新しいファイルを足し、読み手は回ごとに最新を使う）
 * 読むもの: scripts/lib/review-wiring.mjs の evidence「checks」（管理画面のレビュー手順）。
 *   レポートの「## 点検と Issue」節に、要対応の各項目を「- <コマンド名 or #番号> … → 振り分け: DN-xxxx / 定常 / 理由」で書く。
 *
 * Usage:
 *   npm run review-checks -- --cadence monthly --run 2026-09 [--write] [--json]
 *   npm run review-checks -- --cadence weekly --run 2026-W40 --write
 * exit: 0 実行できた（失敗した点検があっても 0）/ 2 点検を 1 本も実行できなかった・引数不正
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS_DIR, CONFIG, checksFileName } from './lib/review-wiring.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const cadence = arg('--cadence');
const runKey = arg('--run');
const WRITE = args.includes('--write');
const JSON_OUT = args.includes('--json');
const TIMEOUT_MS = 180_000;

const config = JSON.parse(readFileSync(join(ROOT, CONFIG), 'utf8'));
const c = config.cadences?.[cadence];
const keyRe = cadence === 'weekly' ? /^\d{4}-W\d{2}$/ : /^\d{4}-\d{2}$/;
if (!c || !runKey || !keyRe.test(runKey)) {
  console.error('[review-checks] --cadence weekly|monthly と --run（週次 YYYY-Www・月次 YYYY-MM）が要る');
  process.exit(2);
}

/** 1 行の要約: 出力の最後の空でない行（長すぎれば切る）。 */
const lastLine = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1)?.slice(0, 200) ?? '';
/** 点検の結論行: 「[コマンド名] …」で始まる最後の行（無ければ最後の行）。 */
const verdictLine = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\[[\w:.-]+\]/.test(l)).at(-1)?.slice(0, 200) ?? lastLine(text);

const checks = (c.checks ?? []).map((k) => {
  const [cmd, cmdArgs] = k.command.startsWith('node:')
    ? ['node', [`scripts/${k.command.slice(5)}.mjs`]]
    : ['npm', ['run', '-s', k.command]];
  const started = Date.now();
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS, shell: process.platform === 'win32', windowsHide: true });
  const exitCode = r.status;
  const state = exitCode === 0 ? 'ok' : exitCode === 1 ? 'fail' : 'broken';
  const summary = r.error?.code === 'ETIMEDOUT' ? `${TIMEOUT_MS / 1000} 秒で打ち切り` : verdictLine(`${r.stdout}\n${r.stderr}`);
  return { command: k.command, label: k.label, exitCode, state, summary, seconds: Math.round((Date.now() - started) / 1000) };
});

let issues = [];
let issuesError = null;
const gh = spawnSync('gh', ['issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,createdAt,labels'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000, windowsHide: true });
if (gh.status === 0) {
  issues = JSON.parse(gh.stdout).map((i) => ({ number: i.number, title: i.title, createdAt: i.createdAt, labels: i.labels.map((l) => l.name) }))
    .sort((a, b) => a.number - b.number);
} else {
  issuesError = lastLine(gh.stderr) || 'gh issue list が失敗';
}

// 依存の脆弱性（Dependabot）。push のたびに警告が出るだけで、どの検査・Issue にも入っていなかった（2026-10-01）。
let alerts = [];
let alertsError = null;
const dep = spawnSync('gh', ['api', 'repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100'], { cwd: ROOT, encoding: 'utf8', timeout: 60_000, windowsHide: true, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
if (dep.status === 0) {
  alerts = JSON.parse(dep.stdout).map((a) => ({ number: a.number, severity: a.security_advisory?.severity, package: a.dependency?.package?.name, summary: a.security_advisory?.summary, createdAt: a.created_at }))
    .sort((a, b) => a.number - b.number);
} else {
  alertsError = lastLine(dep.stderr) || 'dependabot alerts を読めない';
}

const result = { cadence, runKey, ranAt: new Date().toISOString(), checks, issues, alerts, ...(issuesError ? { issuesError } : {}), ...(alertsError ? { alertsError } : {}) };
const ran = checks.filter((k) => k.state !== 'broken').length;

if (JSON_OUT) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`[review-checks] ${c.label} ${runKey}: 点検 ${checks.length} 本中 ${ran} 本を実行 / 要対応 ${checks.filter((k) => k.state === 'fail').length}・検査不成立 ${checks.filter((k) => k.state === 'broken').length} / 開いている Issue ${issuesError ? '読めない' : issues.length} / 依存の脆弱性 ${alertsError ? '読めない' : alerts.length}`);
  for (const k of checks) console.log(`  ${k.state === 'ok' ? '✓' : k.state === 'fail' ? '✗' : '?'} ${k.command}（${k.label}）${k.state === 'ok' ? '' : ` — ${k.summary}`}`);
  const pkgs = [...new Set(alerts.map((a) => a.package))];
  const pending = [
    ...checks.filter((k) => k.state !== 'ok').map((k) => `- ${k.command}: ${k.summary} → 振り分け: `),
    ...issues.map((i) => `- #${i.number} ${i.title}（${i.createdAt.slice(0, 10)}〜） → 振り分け: `),
    ...pkgs.map((p) => `- dependabot:${p} ${alerts.filter((a) => a.package === p).map((a) => a.severity).join('・')} → 振り分け: `),
  ];
  if (pending.length) console.log(`\nレポートの「## 点検と Issue」に、次の各行の行き先（DN-xxxx・定常・理由）を書く:\n${pending.join('\n')}`);
}

if (WRITE) {
  mkdirSync(join(ROOT, CHECKS_DIR), { recursive: true });
  const out = join(CHECKS_DIR, checksFileName(cadence, runKey, result.ranAt));
  writeFileSync(join(ROOT, out), `${JSON.stringify(result, null, 2)}\n`);
  if (!JSON_OUT) console.log(`\n[review-checks] 書き込み: ${out}`);
}

process.exitCode = checks.length && ran === 0 ? 2 : checks.length ? 0 : 2;
