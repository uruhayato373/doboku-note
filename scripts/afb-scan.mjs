#!/usr/bin/env node
/**
 * afb-scan.mjs — afb の未提携プロモーションを全件走査して自社向け案件を抽出（read-only）
 * ---------------------------------------------------------------------------
 * afb は 3 ASP の中で最も自動化が難しく、2026-07-27 に 7 回失敗した。原因は全て特定済みで、
 * 本スクリプトはその 4 点を正面から解く。**推測で URL を組み立てない**のが要点。
 *
 *   1. サイト切替  … Chosen ウィジェットの実クリックのみ有効（URL も JS の change も効かない）。
 *                    切替後に SID を read-back し、**不一致なら例外で停止**（stats47 を読む事故の防止）
 *   2. ページャ    … `/pa/promolist?%2Fpa%2Fpromolist%2F=&rel=non&p=N` という特殊形。
 *                    URL を組み立てて直接叩くと一覧が出ない（POST 状態依存）。**実リンクをクリック**して辿る。
 *                    「次へ」が無く「1 2 3 【最後】」表記なので、各ページで新出の番号リンクを踏む
 *   3. 一覧の解析  … 【PID:N】カテゴリ / 企業名 / プロモーション名 / 報酬 の 4 行ブロック。
 *                    行単位の grep では取りこぼす。1 ページ 50 件・新着順なので**深いページまで踏む**
 *   4. セッション  … storageState が別プロセスで復元できず headless も拒否される。
 *                    ログイン→走査を 1 プロセス・headed で完結させる
 *
 * usage:
 *   node scripts/afb-scan.mjs                 # 未提携を全件走査（既定）
 *   node scripts/afb-scan.mjs --rel rel       # 提携中を走査
 *   node scripts/afb-scan.mjs --max-pages 10  # ページ数を絞る
 *   node scripts/afb-scan.mjs --all           # 建設系フィルタを外して全件出す
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  loadAspConfig,
  getAsp,
  openAsp,
  ensureTargetSite,
  visibleText,
  checkoutRoot,
  dumpFailure,
  aspBrowserCfg,
  makeRunId,
  SiteAttributionError,
} from "./lib/asp-browser.mjs";

/** 自社（土木・建設の有資格者/受験者）に関係しうる語。広めに取って人が絞る。 */
const CIVIL = /建設|施工|土木|現場|ゼネコン|設備工事|電気工事|プラント|測量|建築|職人|技術者|重機|舗装|solar|太陽光/i;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { rel: "non", maxPages: 45, all: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--rel") o.rel = a[++i];
    else if (a[i] === "--max-pages") o.maxPages = parseInt(a[++i], 10) || 45;
    else if (a[i] === "--all") o.all = true;
  }
  return o;
}

/** 【PID:N】ブロック単位で解析する（行 grep だと 4 行構造を取りこぼす）。 */
function parseBlocks(body, pattern) {
  const lines = body.split("\n").map((l) => l.trim());
  const re = new RegExp(pattern);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const blk = lines.slice(i, i + 7);
    out.push({
      pid: m[1],
      category: (m[2] || "").trim(),
      advertiser: blk[1] || "",
      name: blk[2] || "",
      reward: (blk.find((l) => /円（税込）|％（税込）/.test(l)) || "").replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const root = loadAspConfig();
  const asp = getAsp(root, "afb");
  const runId = makeRunId();
  const debugDir = join(checkoutRoot(asp), asp.browser.debugDir);
  mkdirSync(debugDir, { recursive: true });

  console.log(`afb 走査 [rel=${opts.rel}] 対象サイト=${root.targetSiteName} / 最大 ${opts.maxPages} ページ`);
  if (asp.browser.sessionPersistsAcrossProcesses === false) {
    console.log("※ afb はセッションを別プロセスへ持ち越せないため、毎回ログインが必要です");
  }

  // 管理画面固有 DOM の実在で判定する（可視テキストの部分一致は読み込み途中を通してしまう）
  const isReady = async (page) =>
    !new RegExp(asp.reAuthPattern, "i").test(page.url()) &&
    (await page.locator(asp.readyMarker).count().catch(() => 0)) > 0;

  const { ctx, page } = await openAsp(asp, { isReady, label: "afb" });

  try {
    const listPath = opts.rel === "non" ? asp.unpartneredPath : asp.partneredPath;
    // ★ サイト帰属を確定。ここで落ちたら以降は一切読まない
    const site = await ensureTargetSite(page, asp, root, { navigateTo: listPath });
    console.log(`サイト assert OK: ${site.reason}`);

    let body = await visibleText(page, 60000);
    const total = (body.match(/表示結果：([\d,]+)件/) || [])[1];
    if (!total) {
      await dumpFailure(page, aspBrowserCfg(asp), runId, {
        step: "list-render",
        message: "一覧が描画されていない（連打を避けてここで中止）",
      });
      throw new Error("一覧が描画されていない。debug artifact を確認してください");
    }
    console.log(`総件数: ${total}`);

    const hits = new Map();
    const seenPid = new Set();
    const visited = new Set();
    let pageCount = 0;

    const harvest = (b) => {
      const blocks = parseBlocks(b, asp.listItemPattern);
      let add = 0;
      for (const x of blocks) {
        if (seenPid.has(x.pid)) continue;
        seenPid.add(x.pid);
        const hay = `${x.category} ${x.advertiser} ${x.name}`;
        if (opts.all || CIVIL.test(hay)) {
          hits.set(x.pid, x);
          add++;
        }
      }
      return { add, items: blocks.length };
    };

    const first = harvest(body);
    pageCount++;
    console.log(`  p1: ${first.items} 件中 ${first.add} 件ヒット`);

    // ★ ページャは実リンクをクリックして辿る（URL 直叩きは POST 状態依存で一覧が出ない）
    for (let guard = 0; guard < opts.maxPages; guard++) {
      // page.$$eval は Playwright の DOM 抽出 API（JavaScript の eval() とは別物・外部入力を実行しない）
      const links = await page
        .$$eval("a[href]", (as) =>
          as
            .map((a) => ({ h: a.getAttribute("href") || "", t: (a.textContent || "").trim() }))
            .filter((x) => /promolist.*[?&]p=\d+/.test(x.h)),
        )
        .catch(() => []);
      const next = links
        .map((l) => ({ ...l, n: parseInt((l.h.match(/[?&]p=(\d+)/) || [])[1] || "0", 10) }))
        .filter((l) => l.n > 0 && !visited.has(l.n))
        .sort((a, b) => a.n - b.n)[0];
      if (!next) {
        console.log("  未訪問のページリンクが無くなった → 終了");
        break;
      }
      visited.add(next.n);
      const link = page.locator(`a[href="${next.h.replace(/"/g, '\\"')}"]`).first();
      if (!(await link.count().catch(() => 0))) {
        console.log(`  p${next.n} のリンクを掴めず skip`);
        continue;
      }
      await link.click().catch(() => {});
      await page.waitForTimeout(2500);

      if (new RegExp(asp.reAuthPattern, "i").test(page.url())) {
        console.log(`  ⚠️ p${next.n} でセッション切れ → 打切（${pageCount} ページ走査済み）`);
        break;
      }
      body = await visibleText(page, 60000);
      if (!/表示結果/.test(body)) {
        console.log(`  p${next.n} 一覧なし → skip`);
        continue;
      }
      pageCount++;
      const r = harvest(body);
      if (r.add) console.log(`  p${next.n}: ${r.items} 件中 ${r.add} 件ヒット（累計 ${hits.size}）`);
      else if (pageCount % 10 === 0) console.log(`  p${next.n}: …（走査 ${pageCount} / 累計 ${hits.size}）`);
    }

    const out = {
      runId,
      collectedAt: new Date().toISOString(),
      site: root.targetSiteName,
      siteId: site.actualSiteId,
      rel: opts.rel,
      total: Number(String(total).replace(/,/g, "")),
      pagesScanned: pageCount,
      itemsSeen: seenPid.size,
      filtered: opts.all ? "none" : "civil",
      hits: [...hits.values()],
    };
    const outPath = join(debugDir, `scan-${opts.rel}-${runId}.json`);
    writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");

    console.log(`\n=== 走査 ${pageCount} ページ / 見た件数 ${seenPid.size} / ヒット ${hits.size} 件 ===`);
    for (const x of hits.values()) {
      console.log(`  [PID:${x.pid}] ${x.category}  ${x.name.slice(0, 56)}`);
      console.log(`      ${x.advertiser.slice(0, 38)}  報酬 ${x.reward || "-"}`);
    }
    if (seenPid.size < out.total) {
      console.log(
        `\n⚠️ 全 ${out.total} 件のうち ${seenPid.size} 件しか見ていません。` +
          `「ヒット 0 件」を「該当なし」と読まないこと（--max-pages を増やして再走査）`,
      );
    }
    console.log(`\n結果: ${outPath}`);
  } catch (e) {
    if (e instanceof SiteAttributionError) {
      console.error(`\n❌ サイト帰属を確定できないため中止しました。\n   ${e.message}`);
      console.error("   afb は既定で stats47 が選択されます。他サイトのデータを取り込まないための停止です。");
      await ctx.close();
      process.exit(5);
    }
    throw e;
  } finally {
    await ctx.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
