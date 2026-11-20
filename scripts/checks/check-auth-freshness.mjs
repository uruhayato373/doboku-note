#!/usr/bin/env node
/**
 * npm run check-auth-freshness — 土曜の収集の認証記録をオフラインで点検する。
 * Cookie は更新日時だけを見る。鮮度は認証成功を保証しない。空・欠測を PASS にしない。
 * 読み手: SessionStart・週次レビュー下書き・土曜 auth 段の検算。ブラウザと資格情報ストアは開かない。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { resolveProfileDir, resolveStatePath } from '../lib/playwright-auth-profile.mjs';
import { authMtimeMs, failMarkPath, failMarkDecision, lastStatusPath, AUTH_RETRY_MS } from '../lib/auth-session-refresh.mjs';
import { readJsonIf } from '../lib/json-io.mjs';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { createOutput, isCliEntry, runAsCli } from '../lib/cli-run.mjs';

export const AUTH_SERVICES = ['a8', 'moshimo', 'kdp', 'note', 'coconala'];
export function inspectAuthFreshness({ options = { cwd: REPO_ROOT, repoRoot: REPO_ROOT }, services = AUTH_SERVICES, nowMs = Date.now() } = {}) {
  const results = services.map((service) => {
    const profile = resolveProfileDir(service, options);
    const state = resolveStatePath(service, options);
    const mark = failMarkPath(service, options);
    const statusPath = lastStatusPath(service, options);
    const cookieMtimeMs = Math.max(...['Default/Network/Cookies', 'Default/Cookies'].map((p) => authMtimeMs(join(profile, p))).filter(Number.isFinite), 0) || null;
    const stateMtimeMs = state ? authMtimeMs(state) || null : null;
    const marked = existsSync(mark);
    const failure = failMarkDecision({ markText: marked ? readFileSync(mark, 'utf8') : null, markMtimeMs: authMtimeMs(mark), nowMs });
    let lastStatus = null;
    let unreadable = false;
    try { lastStatus = readJsonIf(dirname(statusPath), basename(statusPath)); } catch { unreadable = true; }
    const checked = Date.parse(lastStatus?.checkedAt);
    const fresh = Number.isFinite(checked) && checked <= nowMs && nowMs - checked < AUTH_RETRY_MS;
    const needsLogin = marked && !failure.retry || lastStatus?.status === 'expired' || lastStatus?.status === 'blocked';
    const reason = marked ? `${failure.reason}（${failure.retry ? '自動再試行可' : '人のログインが必要'}）`
      : unreadable ? '認証記録を読めない' : lastStatus?.status !== 'authenticated' ? '認証成功の記録なし' : !fresh ? '認証確認から7日以上・再確認が必要' : '認証確認は7日以内';
    return { service, marked, failureReason: marked ? failure.reason : null, cookieMtimeMs, stateMtimeMs: Number.isFinite(stateMtimeMs) ? stateMtimeMs : null, lastStatus, needsLogin, reason,
      ok: !marked && fresh && lastStatus?.status === 'authenticated',
      command: `npm run auth:${needsLogin ? 'login' : 'status'} -- --service ${service}` };
  });
  const checked = results.filter((r) => r.marked || r.cookieMtimeMs || r.stateMtimeMs || r.lastStatus).length;
  return { ok: results.length > 0 && checked === results.length && results.every((r) => r.ok), target: results.length, checked, results };
}
export function run({ argv = [], quiet = false, ...input } = {}) {
  const out = createOutput({ quiet });
  const args = parseCliArgs({ json: { type: 'boolean' }, session: { type: 'boolean' } }, argv);
  try {
    const report = inspectAuthFreshness(input);
    const issues = report.results.filter((r) => !r.ok);
    const summary = `[auth-freshness] ${report.ok ? 'OK' : 'FAIL'} 対象 ${report.target} 件 / 実検査 ${report.checked} 件 / 要ログイン ${report.results.filter((r) => r.needsLogin).length} 件 / 要確認 ${issues.length} 件`;
    if (args.json) out.log(JSON.stringify(report));
    else if (!args.session || !report.ok) {
      out.log(summary);
      if (args.session) out.log(issues.map((r) => `${r.service}: ${r.reason} → ${r.command}`).join(' / '));
      else for (const r of report.results) out.log(`${r.service}: ${r.reason} → ${r.command}; Cookie=${r.cookieMtimeMs ?? 'なし'} state=${r.stateMtimeMs ?? 'なし'} checkedAt=${r.lastStatus?.checkedAt ?? 'なし'}`);
    }
    return out.result(report.ok ? 0 : 1);
  } catch (error) {
    out.error(`[auth-freshness] 検査不成立: ${error.message}`);
    return out.result(1);
  }
}
if (isCliEntry(import.meta.url)) runAsCli(run);
