#!/usr/bin/env node
/**
 * affiliate-apply.mjs — 提携申請を実行する（dry-run 既定・--commit gate）
 * ---------------------------------------------------------------------------
 * 提携申請は「規約への同意」を伴う不可逆操作なので、既定は dry-run。
 * `--commit` を付けたときだけ実際にボタンを押す。
 *
 * 安全弁（どれも過去に実害・未遂があったもの）:
 *   1. **サイト帰属を確定できなければ例外で停止**（asp-site-guard）。既定は stats47 側。
 *   2. **「一括提携申請へ」を絶対に押さない**。ラベル完全一致 ＋ 「一括」を含むものを明示除外。
 *      部分一致でボタンを拾うと**画面上の全案件を一度に申請**してしまう。
 *   3. もしもの申請ページには**サイト select** があり、未選択のまま押すと stats47 で提携する。
 *      選択して read-back で確認してからでないと押さない。
 *   4. ログイン・CAPTCHA は人間。認証情報は扱わない。
 *   5. Red Line 案件（カタログの `redLine: true`）は `--commit` でも申請しない。
 *
 * usage:
 *   node scripts/affiliate-apply.mjs --asp moshimo --id 6154            # dry-run
 *   node scripts/affiliate-apply.mjs --asp moshimo --id 6154 --commit   # 実申請
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadAspConfig, getAsp, openAsp, ensureTargetSite, visibleText, dumpFailure } from "./lib/asp-browser.mjs";

const CATALOG = ".claude/state/ads/affiliate-catalog.json";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { asp: null, ids: [], commit: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--asp") o.asp = a[++i];
    else if (a[i] === "--id") o.ids.push(...a[++i].split(",").map((s) => s.trim()));
    else if (a[i] === "--commit") o.commit = true;
  }
  if (!o.asp || o.ids.length === 0) {
    console.error("usage: --asp <a8|moshimo|afb> --id <id[,id]> [--commit]");
    process.exit(2);
  }
  return o;
}

/** カタログから該当エントリを引く（Red Line 判定と記録更新のため）。 */
function findInCatalog(catalog, aspName, id) {
  for (const [key, p] of Object.entries(catalog.programs ?? {})) {
    const e = p.asps?.[aspName];
    if (!e) continue;
    if ([e.programId, e.promotionId, e.pid].filter(Boolean).map(String).includes(String(id))) {
      return { key, program: p, entry: e };
    }
  }
  return null;
}

/** 詳細ページ URL を組み立てる。 */
function detailUrl(asp, aspName, id) {
  if (aspName === "moshimo") return `/af/shop/promotion/${id}`;
  if (aspName === "afb") return `/pa/promo_detail/?pid=${id}`;
  throw new Error(`${aspName}: 申請の自動化は未対応（A8 の申請は /scout-asp が担当）`);
}

/**
 * 申請ボタンを一意に特定する。**「一括」を含むものは候補から外す**。
 * exact 一致で探し、複数ヒットしたら押さずに落とす（どれを押したか曖昧なまま進めない）。
 */
async function findApplyButton(page, label) {
  const all = page.getByRole("button", { name: label, exact: true });
  const links = page.getByRole("link", { name: label, exact: true });
  const pool = [];
  for (const loc of [all, links]) {
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      const t = (await el.innerText().catch(() => "")) || "";
      if (t.includes("一括")) continue; // ← 絶対に押さない
      pool.push(el);
    }
  }
  if (pool.length === 0) return { ok: false, reason: `「${label}」が見つからない（既に提携済み/申請中の可能性）` };
  if (pool.length > 1) return { ok: false, reason: `「${label}」が ${pool.length} 個ある。どれを押すか確定できないので中止` };
  return { ok: true, el: pool[0] };
}

/** もしもの申請フォームにあるサイト select を doboku-note にして read-back 確認する。 */
async function selectSiteInForm(page, asp, targetName) {
  const sel = page.locator("select").filter({ hasText: targetName }).first();
  if (!(await sel.count().catch(() => 0))) return { ok: true, reason: "サイト select 無し（不要）" };
  await sel.selectOption({ label: targetName }).catch(async () => {
    await sel.selectOption(asp.sites[targetName]).catch(() => {});
  });
  await page.waitForTimeout(500);
  const chosen = await sel.evaluate((s) => s.options[s.selectedIndex]?.text ?? "").catch(() => "");
  if (!chosen.includes(targetName)) {
    return { ok: false, reason: `サイト select を ${targetName} にできなかった（現在: ${chosen || "不明"}）` };
  }
  return { ok: true, reason: `サイト select = ${chosen}` };
}

async function main() {
  const opts = parseArgs();
  const root = loadAspConfig();
  const asp = getAsp(root, opts.asp);
  const catalog = JSON.parse(readFileSync(CATALOG, "utf-8"));

  console.log(`提携申請 [${asp.label}] ${opts.ids.length} 件  モード=${opts.commit ? "★実申請" : "dry-run"}`);

  // Red Line は --commit でも通さない（gate の前に落とす）
  const blocked = [];
  for (const id of opts.ids) {
    const hit = findInCatalog(catalog, opts.asp, id);
    if (hit?.program?.redLine) blocked.push({ id, key: hit.key });
  }
  if (blocked.length) {
    for (const b of blocked) console.error(`  ✗ ${b.id}（${b.key}）は Red Line 案件。申請しない`);
    process.exit(1);
  }

  const isReady = asp.readyMarker
    ? async (page) =>
        !new RegExp(asp.reAuthPattern, "i").test(page.url()) &&
        (await page.locator(asp.readyMarker).count().catch(() => 0)) > 0
    : undefined;
  const { ctx, page } = await openAsp(asp, { isReady, label: opts.asp });

  const results = [];
  try {
    for (const id of opts.ids) {
      const path = detailUrl(asp, opts.asp, id);
      // サイト帰属の確定（不一致は例外で全体が止まる。握り潰さない）
      const site = await ensureTargetSite(page, asp, root, { navigateTo: path });
      console.log(`\n[${id}] ${site.reason}`);

      const text = await visibleText(page, 4000);
      const title = (text.split("\n").find((l) => l.trim().length > 4) || "").trim().slice(0, 60);

      const btn = await findApplyButton(page, asp.applyButtonLabel ?? "提携申請する");
      if (!btn.ok) {
        console.log(`  skip: ${btn.reason}`);
        results.push({ id, title, action: "skip", reason: btn.reason });
        continue;
      }

      const siteSel = await selectSiteInForm(page, asp, root.targetSiteName);
      if (!siteSel.ok) {
        console.log(`  ✗ ${siteSel.reason}`);
        results.push({ id, title, action: "abort", reason: siteSel.reason });
        continue;
      }
      console.log(`  ${siteSel.reason}`);

      if (!opts.commit) {
        console.log(`  dry-run: 「${asp.applyButtonLabel}」を押せる状態（押していない）`);
        results.push({ id, title, action: "dry-run", reason: "押下可能" });
        continue;
      }

      await btn.el.click();
      await page.waitForTimeout(4000);
      const after = await visibleText(page, 4000);
      const ok = /申請|受付|提携中|完了/.test(after);
      console.log(`  ${ok ? "✓ 申請した" : "△ 結果を確認できない"}`);
      if (!ok) await dumpFailure(page, { browser: asp.browser }, `apply-${opts.asp}-${id}`).catch(() => {});
      results.push({ id, title, action: ok ? "applied" : "unverified", reason: ok ? "" : "申請後の文言を確認できず" });

      // カタログへ反映（実機の真実は affiliate:status が上書きする。ここは暫定記録）
      const hit = findInCatalog(catalog, opts.asp, id);
      if (ok && hit) hit.entry.status = "applying";
    }
  } finally {
    await ctx.close().catch(() => {});
  }

  if (opts.commit && results.some((r) => r.action === "applied")) {
    catalog.updatedAt = new Date().toISOString();
    writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
    console.log(`\nカタログを更新（applying へ）。実状態は npm run affiliate:status で確認する`);
  }

  console.log(`\n=== まとめ ===`);
  for (const r of results) console.log(`  ${r.action.padEnd(10)} ${r.id} ${r.title}${r.reason ? ` — ${r.reason}` : ""}`);
  if (!opts.commit) console.log(`\n→ 実申請するには --commit を付ける（規約同意を伴うのでユーザーの明示許可が要る）`);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
