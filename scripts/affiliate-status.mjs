#!/usr/bin/env node
/**
 * affiliate-status.mjs — 3 ASP の提携状態を実機と突合する（read-only）
 * ---------------------------------------------------------------------------
 * `.claude/state/ads/affiliate-catalog.json`（自社がどの案件をどの ASP で運用するか）を
 * 実機の提携中/申請中一覧と突合し、**ドリフト**を報告する。
 *
 * 安全弁:
 *   - **サイト帰属を確定できなければ例外で停止**（asp-site-guard）。3 ASP すべて既定は stats47。
 *   - read-only。申請も設定変更もしない（申請は affiliate-apply.mjs）。
 *   - ログインは人間。afb はセッションを持ち越せないため毎回ログインが要る。
 *   - **取得できなかった ASP を「提携なし」と混同しない**（unknown として区別する）。
 *
 * usage:
 *   node scripts/affiliate-status.mjs                 # 全 ASP
 *   node scripts/affiliate-status.mjs --asp moshimo   # 1 ASP だけ
 *   node scripts/affiliate-status.mjs --write         # 実機の値でカタログを更新
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { todayJst } from './lib/jst-date.mjs';

import {
  loadAspConfig,
  getAsp,
  openAsp,
  ensureTargetSite,
  visibleText,
  checkoutRoot,
  SiteAttributionError,
} from "./lib/asp-browser.mjs";

import { detectFalseNegative } from "./lib/asp-falsenegative-guard.mjs";

const CATALOG = ".claude/state/ads/affiliate-catalog.json";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { asps: null, write: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--asp") o.asps = a[++i].split(",").map((s) => s.trim());
    else if (a[i] === "--write") o.write = true;
  }
  return o;
}

/** 実機の一覧テキストから「この ASP で提携済み/申請中の識別子」を集める。 */
function collectIds(text, asp) {
  const ids = new Set();
  // afb: 【PID:N】
  if (asp.listItemPattern) {
    for (const m of text.matchAll(new RegExp(asp.listItemPattern.replace(/^\^|\$$/g, ""), "gm"))) {
      if (m[1]) ids.add(m[1]);
    }
  }
  // もしも: promotion_id はテキストに出ないので名前で拾う（呼び出し側が名前照合する）
  return ids;
}

/** カタログの ASP エントリの識別子（ASP ごとにキー名が違う）。 */
const idOf = (entry) => entry?.programId ?? entry?.promotionId ?? entry?.pid ?? null;

async function checkAsp(name, root, log) {
  const asp = getAsp(root, name);
  const isReady = asp.readyMarker
    ? async (page) =>
        !new RegExp(asp.reAuthPattern, "i").test(page.url()) &&
        (await page.locator(asp.readyMarker).count().catch(() => 0)) > 0
    : undefined;

  const { ctx, page } = await openAsp(asp, { isReady, label: name });
  try {
    const out = { asp: name, siteId: null, partnered: { ids: new Set(), text: "" }, applying: { ids: new Set(), text: "" } };
    for (const [key, path] of [
      ["partnered", asp.partneredPath],
      ["applying", asp.applyingPath],
    ]) {
      if (!path) continue;
      const site = await ensureTargetSite(page, asp, root, { navigateTo: path });
      out.siteId = site.actualSiteId;
      // 一覧が描画されるまで待つ（固定 sleep だと遅い回線で空を読む）
      await page
        .waitForFunction(() => document.body && document.body.innerText.length > 500, null, {
          timeout: asp.browser.timeoutMs ?? 30000,
          polling: 1000,
        })
        .catch(() => {});
      const t = await visibleText(page, 200000);
      out[key] = { ids: collectIds(t, asp), text: t };
      log(`  ${name}/${key}: ${out[key].ids.size} 件の ID を検出（SID ${site.actualSiteId ?? "-"}）`);
    }
    return out;
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function main() {
  const opts = parseArgs();
  const root = loadAspConfig();
  const catalog = JSON.parse(readFileSync(CATALOG, "utf-8"));
  const targets = opts.asps ?? Object.keys(root.asps);

  const debugDir = join(checkoutRoot(getAsp(root, targets[0])), ".local/affiliate-status");
  mkdirSync(debugDir, { recursive: true });
  const logPath = join(debugDir, "status.log");
  writeFileSync(logPath, "", "utf-8");
  const log = (m) => {
    console.log(m);
    try {
      appendFileSync(logPath, `${new Date().toISOString()} ${m}\n`, "utf-8");
    } catch {}
  };

  log(`アフィリ状態照合 [${targets.join(", ")}]  対象サイト=${root.targetSiteName}`);

  const live = {};
  const failed = {};
  for (const name of targets) {
    try {
      live[name] = await checkAsp(name, root, log);
    } catch (e) {
      // 取得できなかった ASP を「提携なし」と混同しないため、失敗として記録する
      failed[name] = e instanceof SiteAttributionError ? `サイト帰属 NG: ${e.message}` : String(e.message).slice(0, 150);
      log(`  ⚠️ ${name}: 取得できず（${failed[name]}）→ この ASP は判定不能として扱う`);
    }
  }

  // ── カタログと突合
  const drift = [];
  for (const [key, p] of Object.entries(catalog.programs ?? {})) {
    for (const [aspName, entry] of Object.entries(p.asps ?? {})) {
      if (!live[aspName]) continue; // 取得できなかった ASP は判定しない
      const id = idOf(entry);
      if (!id) continue;
      const inPartnered = live[aspName].partnered.ids.has(id) || live[aspName].partnered.text.includes(id);
      const inApplying = live[aspName].applying.ids.has(id) || live[aspName].applying.text.includes(id);
      const actual = inPartnered ? "approved" : inApplying ? "applying" : "none";
      if (actual !== entry.status) {
        drift.push({ program: key, asp: aspName, catalog: entry.status, actual, id });
      }
    }
  }

  console.log(`\n=== 突合結果 ===`);
  if (Object.keys(failed).length) {
    console.log("取得できなかった ASP（判定不能・「提携なし」ではない）:");
    for (const [k, v] of Object.entries(failed)) console.log(`  - ${k}: ${v}`);
  }
  if (drift.length === 0) {
    console.log(`ドリフトなし（照合できた ASP: ${Object.keys(live).join(", ") || "なし"}）`);
  } else {
    console.log(`ドリフト ${drift.length} 件:`);
    for (const d of drift) {
      console.log(`  - ${d.program} / ${d.asp}: カタログ "${d.catalog}" ↔ 実機 "${d.actual}"（id=${d.id}）`);
    }
    // ── 偽陰性ガード（2026-08-13 新設）
    // セッション切れは「取得は成功したが 0 件」という形で来るため failed に入らず、
    // approved → none の一括ドリフトとして**そのまま書き込まれる**。実際 2026-08-13 の
    // 実行で a8/moshimo とも partnered 0 件（SID は取れているのに 0）という結果が出ていた。
    // --write を付けていれば 9 件のカタログが none で塗り潰されていた。
    // 判定は純関数へ切り出してテスト可能にする（asp-site-guard と同じ設計方針）。
    const knownApprovedByAsp = {};
    const partneredSeenByAsp = {};
    for (const aspName of Object.keys(live)) {
      knownApprovedByAsp[aspName] = Object.values(catalog.programs ?? {}).filter(
        (p) => p.asps?.[aspName] && idOf(p.asps[aspName]) && p.asps[aspName].status === 'approved',
      ).length;
      partneredSeenByAsp[aspName] = live[aspName].partnered.ids.size;
    }
    const blocked = detectFalseNegative({
      aspNames: Object.keys(live),
      drift,
      knownApprovedByAsp,
      partneredSeenByAsp,
    });
    if (blocked.length && opts.write) {
      console.error('\n★ --write を中止しました（偽陰性ガード）:');
      for (const b of blocked) console.error(`  - ${b.asp}: ${b.reason}`);
      console.error('  実機に再ログインしてから再実行するか、本当に解除されたなら該当 ASP を');
      console.error('  --asp で個別指定して確認したうえで書き込むこと。');
      console.error(`ログ: ${logPath}`);
      process.exit(4);
    }
    if (blocked.length) {
      console.log('\n★ 偽陰性の疑い（--write を付けていれば中止していた）:');
      for (const b of blocked) console.log(`  - ${b.asp}: ${b.reason}`);
    }

    if (opts.write) {
      for (const d of drift) catalog.programs[d.program].asps[d.asp].status = d.actual;
      catalog.updatedAt = new Date().toISOString();
      catalog.verifiedAt = todayJst();
      writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
      console.log(`\n→ --write によりカタログを実機の値へ更新しました`);
    } else {
      console.log(`\n→ 反映するなら --write を付けて再実行（既定は read-only）`);
    }
  }
  console.log(`ログ: ${logPath}`);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
