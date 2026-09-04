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
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadAspConfig,
  getAsp,
  openAsp,
  ensureTargetSite,
  visibleText,
  debugRoot,
  dumpFailure,
  aspBrowserCfg,
  makeRunId,
  SiteAttributionError,
} from "./lib/asp-browser.mjs";

/** 自社（土木・建設の有資格者/受験者）に関係しうる語。広めに取って人が絞る。 */
const CIVIL = /建設|施工|土木|現場|ゼネコン|設備工事|電気工事|プラント|測量|建築|職人|技術者|重機|舗装|solar|太陽光/i;

/**
 * 既定の検索語。全 1,896 件を踏むより**検索で絞る方が圧倒的に速い**。
 * 実測: 1 ページの読み込みに 1〜1.5 分かかる回線状況では、38 ページ走査は現実的でない
 * （2026-07-27 実走で確認。半分は待ち時間内に描画が終わらず取りこぼした）。
 */
const DEFAULT_QUERIES = ["施工管理", "建設", "土木", "現場", "設備"];

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { rel: "non", maxPages: 45, all: false, mode: "search", queries: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--rel") o.rel = a[++i];
    else if (a[i] === "--max-pages") o.maxPages = parseInt(a[++i], 10) || 45;
    else if (a[i] === "--all") o.all = true;
    else if (a[i] === "--mode") o.mode = a[++i]; // search（既定） | crawl
    else if (a[i] === "--query") o.queries = a[++i].split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!o.queries) o.queries = DEFAULT_QUERIES;
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
  const debugDir = debugRoot(aspBrowserCfg(asp));
  mkdirSync(debugDir, { recursive: true });

  // ★ バックグラウンド実行だと stdout がバッファされ進捗が見えない（診断できず何度も無駄打ちした）。
  //   同じ内容をログファイルにも即時追記して、走行中でも外から状態を確認できるようにする。
  const logPath = join(debugDir, "scan-progress.log");
  writeFileSync(logPath, "", "utf-8");
  const log = (msg) => {
    console.log(msg);
    try {
      appendFileSync(logPath, `${new Date().toISOString()} ${msg}
`, "utf-8");
    } catch {}
  };
  log(`afb 走査 [rel=${opts.rel}] [mode=${opts.mode}] 対象サイト=${root.targetSiteName}`);
  if (opts.mode === "search") log(`  検索語: ${opts.queries.join(" / ")}`);
  log(`進捗ログ: ${logPath}`);
  if (asp.browser.sessionPersistsAcrossProcesses === false) {
    log("※ afb はセッションを別プロセスへ持ち越せないため、毎回ログインが必要です");
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
    log(`サイト assert OK: ${site.reason}`);

    let body = await visibleText(page, 60000);
    const total = (body.match(/表示結果：([\d,]+)件/) || [])[1];
    if (!total) {
      await dumpFailure(page, aspBrowserCfg(asp), runId, {
        step: "list-render",
        message: "一覧が描画されていない（連打を避けてここで中止）",
      });
      throw new Error("一覧が描画されていない。debug artifact を確認してください");
    }
    log(`総件数: ${total}`);

    const hits = new Map();
    const seenPid = new Set();
    const visited = new Set();
    let dumpedFailure = false;
    let searchedQueries = [];
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
    log(`  p1: ${first.items} 件中 ${first.add} 件ヒット`);
    visited.add(1); // 1 ページ目は取得済み（入れ忘れると同じページを踏み直す）

    // ── 検索モード（既定）: 1,896 件を全部踏まず、検索で絞る
    if (opts.mode === "search") {
      const queried = [];
      for (const q of opts.queries) {
        const box = page.locator(`input[name='${asp.searchParam}']`).first();
        if (!(await box.count().catch(() => 0))) {
          log(`  検索欄 input[name=${asp.searchParam}] が無い → crawl モードで再実行してください`);
          break;
        }
        await box.fill(q).catch(() => {});
        // 送信は <button> ではなく input[type=submit]。role=button では見つからない
        const submit = page.locator(asp.searchSubmitSelector).first();
        if (await submit.count().catch(() => 0)) await submit.click().catch(() => {});
        else await box.press("Enter").catch(() => {});

        const shown = await page
          .waitForFunction(() => document.body && document.body.innerText.includes("表示結果"), null, { timeout: 60000 })
          .then(() => true)
          .catch(() => false);
        const b = await visibleText(page, 200000);
        if (!shown || !/表示結果/.test(b)) {
          log(`  検索「${q}」: 一覧が出ず skip`);
          continue;
        }
        const cnt = (b.match(/表示結果：([\d,]+)件/) || [])[1] ?? "?";
        const r = harvest(b);
        queried.push(q);
        log(`  検索「${q}」: ${cnt}件中 ${r.items} 件表示 / 新規ヒット ${r.add}（累計 ${hits.size}）`);
        // 検索結果が 1 ページに収まらない場合の続きは crawl モードに任せる（回線が遅いので深追いしない）
        await page.goto(asp.baseUrl + asp.searchPath, { waitUntil: "domcontentloaded" }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      searchedQueries = queried;
    }

    // ★ ページ送りは GET では復元できない（クリックでも直 URL でも一覧が出ない＝POST 状態依存）。
    //   先に **表示件数を最大にして POST 再送信** し、ページ送り自体を回避することを試みる。
    const limitSel = page.locator("select[name='limit']").first();
    if (await limitSel.count().catch(() => 0)) {
      const opts = await limitSel.locator("option").allTextContents().catch(() => []);
      const vals = await limitSel
        .locator("option")
        .evaluateAll((os) => os.map((o) => o.value))
        .catch(() => []);
      const maxVal = vals
        .map((v) => ({ v, n: parseInt(v, 10) }))
        .filter((x) => Number.isFinite(x.n))
        .sort((a, b) => b.n - a.n)[0];
      log(`  表示件数 select: ${JSON.stringify(opts.slice(0, 6))} → 最大 ${maxVal?.v ?? "不明"}`);
      if (maxVal && maxVal.n > 50) {
        await limitSel.selectOption(maxVal.v).catch(() => {});
        await page.waitForTimeout(1000);
        // onchange で送信されない作りに備えて、フォームを明示的に submit する
        await page
          .$eval("select[name='limit']", (s) => {
            const f = s.closest("form");
            if (f) f.submit();
          })
          .catch(() => {});
        await page.waitForTimeout(5000);
        const b2 = await visibleText(page, 200000);
        if (/表示結果/.test(b2)) {
          const r2 = harvest(b2);
          log(`  表示件数=${maxVal.v} で再取得: ${r2.items} 件中 ${r2.add} 件ヒット（累計 ${hits.size}）`);
          body = b2;
        } else {
          log("  表示件数変更後に一覧が出ず → ページ送りへ戻る");
        }
      }
    } else {
      log("  表示件数 select が無い → ページ送りで辿る");
    }

    // ★ ページ送りは crawl モードのときだけ。回線が遅い環境では 1 ページ 1〜1.5 分かかり、
    //   38 ページ走査は現実的でない（実測）。既定は上の検索モードで絞る。
    for (let guard = 0; opts.mode === "crawl" && guard < opts.maxPages; guard++) {
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
        log("  未訪問のページリンクが無くなった → 終了");
        break;
      }
      visited.add(next.n);
      const link = page.locator(`a[href="${next.h.replace(/"/g, '\\"')}"]`).first();
      if (!(await link.count().catch(() => 0))) {
        log(`  p${next.n} のリンクを掴めず skip`);
        continue;
      }
      await link.click().catch(() => {});

      // ★ 固定 sleep で読むと**描画途中のページ**を掴む（診断ダンプの本文が「▲Page Top」だけだった）。
      //   一覧が現れるまで待つ。出なければ 1 回だけ再読込して待ち直す（断続的な失敗はこれで消える）。
      const waitForList = async (ms) =>
        page
          .waitForFunction(() => document.body && document.body.innerText.includes("表示結果"), null, { timeout: ms })
          .then(() => true)
          .catch(() => false);

      let shown = await waitForList(15000);
      if (!shown) {
        await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
        shown = await waitForList(15000);
      }

      if (new RegExp(asp.reAuthPattern, "i").test(page.url())) {
        log(`  ⚠️ p${next.n} でセッション切れ → 打切（${pageCount} ページ走査済み）`);
        break;
      }
      body = await visibleText(page, 60000);
      if (!/表示結果/.test(body)) {
        log(`  p${next.n} 一覧なし → skip（url=${page.url()}）`);
        // 最初の 1 回だけ実ページを保存する。原因を推測で語らないための材料。
        if (!dumpedFailure) {
          dumpedFailure = true;
          const fp = join(debugDir, `pager-fail-p${next.n}-${runId}.txt`);
          writeFileSync(fp, `url=${page.url()}
href=${next.h}

${body}`, "utf-8");
          log(`  診断ダンプ: ${fp}`);
        }
        continue;
      }
      pageCount++;
      const r = harvest(body);
      if (r.add) log(`  p${next.n}: ${r.items} 件中 ${r.add} 件ヒット（累計 ${hits.size}）`);
      else if (pageCount % 10 === 0) log(`  p${next.n}: …（走査 ${pageCount} / 累計 ${hits.size}）`);
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
      mode: opts.mode,
      queries: searchedQueries,
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
    if (opts.mode === "crawl" && seenPid.size < out.total) {
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
