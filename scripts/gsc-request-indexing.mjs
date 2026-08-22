#!/usr/bin/env node
/**
 * gsc-request-indexing.mjs — GSC「URL 検査」で未登録 URL を診断し、インデックス登録を要求する（ローカル専用）
 * ---------------------------------------------------------------------------
 * なぜ必要か: 「クロール済み - インデックス未登録」は技術的阻害が無い（robots ALLOWED・canonical 一致・
 * ハブから直リンク有）状態でも起きる＝Google の選別。実測（2026-07-30）で civil-1 textbook の
 * 未登録 20 本はすべてこの状態だった。この状態に対して残っている直接レバーが URL 検査からの
 * **インデックス登録リクエスト**で、20 本を手作業で回すのは現実的でないため自動化する。
 *
 * **既定は診断のみ（dry-run）**。リクエスト送信は `--commit` を明示したときだけ実行する。
 * 送信は Google に対する外向きの操作なので、既定で押さない（draft-first）。
 *
 * CLI:
 *   node scripts/gsc-request-indexing.mjs --from-ssot --group textbook --category civil-construction-1
 *   node scripts/gsc-request-indexing.mjs --urls /docs/a,/docs/b            # 明示指定
 *   node scripts/gsc-request-indexing.mjs --from-ssot ... --commit          # 実際にリクエスト
 *   node scripts/gsc-request-indexing.mjs --from-ssot ... --limit 10        # 日次クォータ対策
 *
 * 安全弁:
 *   - **既定 dry-run**。`--commit` 無しでは「インデックス登録をリクエスト」を押さない。
 *   - 1 回の実行で送る上限は既定 10 件（GSC の日次クォータは公表されていないが概ね 10〜15 件で
 *     打ち止めになる）。上限に達したら残りを次回へ回して記録する。
 *   - 対象プロパティを URL と画面の両方で assert。不一致なら 1 件も触らず停止。
 *   - 送信後は画面のテキストで受理を確認する（自己申告で成功としない）。受理文言が読めなければ
 *     `unconfirmed` として記録し、成功にカウントしない。
 *   - 診断結果（coverage_state / 最終クロール / canonical）を state に残し、後の効果測定に使う。
 *
 * 出力（追跡）:
 *   .claude/state/metrics/gsc-indexing/requests-latest.json … 最新 run の診断＋送信結果
 *   .claude/state/metrics/gsc-indexing/history.json         … run 別の要約（append）
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  loadConfig,
  launchContext,
  isSignedInToGsc,
  assertGscProperty,
  dumpFailure,
  findUniqueByLabels,
  makeRunId,
} from "./lib/google-console-browser.mjs";
import { collectFailedRequests } from "./lib/report-honesty.mjs";

const STATE_DIR = ".claude/state/metrics/gsc-indexing";
const SSOT_URLS = ".claude/state/metrics/gsc-ui/ssot/urls";
const META = "src/config/doc-meta-index.json";
const SITE = "https://doboku-note.com";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { commit: false, headed: false, fromSsot: false, urls: null, group: null, category: null, limit: 10 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--commit") o.commit = true;
    else if (a[i] === "--headed") o.headed = true;
    else if (a[i] === "--from-ssot") o.fromSsot = true;
    else if (a[i] === "--urls") o.urls = a[++i];
    else if (a[i] === "--group") o.group = a[++i];
    else if (a[i] === "--category") o.category = a[++i];
    else if (a[i] === "--limit") o.limit = parseInt(a[++i], 10) || 10;
  }
  return o;
}

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

/** 「クロール済み - インデックス未登録」の SSOT から対象 slug を選ぶ（category / group で絞る）。 */
function targetsFromSsot({ category, group }) {
  const p = join(SSOT_URLS, "crawledNotIndexed--allKnownPages.json");
  if (!existsSync(p)) {
    throw new Error(`SSOT が無い: ${p}（先に \`npm run search-growth:audit\`）`);
  }
  const rows = JSON.parse(readFileSync(p, "utf8")).rows ?? [];
  const slugs = [...new Set(rows.map((r) => (String(r.url).match(/\/docs\/([a-z0-9-]+)\/?$/) || [])[1]).filter(Boolean))];
  const meta = JSON.parse(readFileSync(META, "utf8")).docs ?? {};
  return slugs.filter((s) => {
    const m = meta[s];
    if (!m || m.published !== true) return false; // 未公開は対象外
    if (category && m.category !== category) return false;
    if (group && (m.group ?? "") !== group) return false;
    return true;
  });
}

/**
 * URL 検査は **上部の検査バーに URL を入れて Enter** でしか開けない。
 * `/inspect?resource_id=…&id=<URL>` のディープリンクは Google 自身が 404 を返す
 * （2026-07-30 実測。Enter 後の URL は `?id=<不透明トークン>` になるため、URL では指定できない）。
 * @returns {Promise<boolean>} 判定文言に到達したか
 */
async function inspectViaSearchBar(page, cfg, target) {
  const box = page.locator('input[aria-label*="検査"], input[aria-label*="Inspect"]').first();
  if (!(await box.count().catch(() => 0))) return false;
  await box.click().catch(() => {});
  await box.fill(target).catch(() => {});
  await page.keyboard.press("Enter").catch(() => {});
  // 検査は 5〜25 秒かかる。判定文言が出るまでポーリングする。
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(4000);
    const t = await page.locator("body").innerText().catch(() => "");
    if (/URL は Google に登録されて|URL が Google に登録されていません|is on Google|is not on Google/.test(t)) return true;
  }
  return false;
}

/** URL 検査画面のテキストから診断項目を読む（変更はしない・文言は 2026-07-30 実測ベース）。 */
async function readInspection(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  const has = (re) => re.test(body);
  let state = null;
  if (has(/URL は Google に登録されていますが問題があります|with problems/)) state = "indexed-with-problems";
  else if (has(/URL は Google に登録されています|URL is on Google/)) state = "indexed";
  else if (has(/URL が Google に登録されていません|URL is not on Google/)) state = "not-indexed";
  // 実機の文言: 「ページはインデックスに登録されていません: クロール済み - インデックス未登録」
  const reason =
    (body.match(/ページはインデックスに登録されていません[:：]\s*(.+)/) ?? [])[1]?.trim() ??
    (body.match(/クロール済み[\s-]+インデックス未登録/) ||
      body.match(/検出[\s-]+インデックス未登録/) ||
      body.match(/代替ページ[（(]適切な canonical/) ||
      [])[0] ??
    null;
  const lastCrawl = (body.match(/前回のクロール\s*\n?\s*([\d/]{8,10}[^\n]*)/) ?? [])[1]?.trim() ?? null;
  return {
    state,
    reason,
    lastCrawl,
    discoveredVia: has(/参照元ページ|サイトマップ/) ? "sitemap" : null,
    crawlAllowed: has(/クロールを許可[？?]?\s*\n?\s*はい|Crawl allowed\s*:?\s*Yes/i)
      ? true
      : has(/クロールを許可[？?]?\s*\n?\s*いいえ/)
        ? false
        : null,
    indexingAllowed: has(/インデックス登録を許可[？?]?\s*\n?\s*はい|Indexing allowed\s*:?\s*Yes/i)
      ? true
      : has(/インデックス登録を許可[？?]?\s*\n?\s*いいえ/)
        ? false
        : null,
  };
}

/**
 * 「インデックス登録をリクエスト」を押す。押した**あとに受理文言を確認**し、
 * 読めなければ unconfirmed（成功にしない）。
 */
async function requestIndexing(page, cfg, runId, target) {
  // 実測: getByText では 2 件ヒットする（可視ボタン＋別要素）。role=button の可視要素だけに絞る。
  // 「公開 URL をテスト」は**別機能**（ライブテスト）なので候補に入れない（誤クリック防止）。
  const cands = page.getByRole("button", { name: /インデックス登録をリクエスト|Request indexing/ });
  const n = await cands.count().catch(() => 0);
  let btn = null;
  for (let i = 0; i < n; i++) {
    const c = cands.nth(i);
    if (await c.isVisible().catch(() => false)) { btn = c; break; }
  }
  if (!btn) {
    await dumpFailure(page, cfg, runId, {
      step: "find-request-button",
      expected: ["インデックス登録をリクエスト（role=button・可視）"],
      message: `リクエストボタンの可視候補が 0 件（role=button 候補 ${n} 件）`,
      candidateCount: n,
    });
    return { requested: false, status: "button-not-found", detail: `role=button 候補 ${n}` };
  }
  await btn.click().catch(() => {});
  // テスト＋登録の処理は数十秒かかる
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const body = await page.locator("body").innerText().catch(() => "");
    if (/インデックス登録をリクエスト済み|リクエストを送信しました|Indexing requested|URL added to a priority crawl queue|優先クロール/i.test(body)) {
      return { requested: true, status: "accepted" };
    }
    if (/1 日あたりの割り当て量を超えました|Quota exceeded|しばらくしてからもう一度/i.test(body)) {
      return { requested: false, status: "quota-exceeded" };
    }
  }
  return { requested: false, status: "unconfirmed", detail: "受理文言を読めなかった（送信された可能性はある）" };
}

async function main() {
  const opts = parseArgs();
  const cfg = loadConfig();
  const runId = makeRunId();
  mkdirSync(STATE_DIR, { recursive: true });

  let slugs = [];
  if (opts.urls) {
    slugs = opts.urls.split(",").map((s) => s.trim().replace(/^\/docs\//, "")).filter(Boolean);
  } else if (opts.fromSsot) {
    slugs = targetsFromSsot({ category: opts.category, group: opts.group });
  }

  // §9: 対象 0 件を成功にしない
  if (slugs.length === 0) {
    console.error("[gsc-indexing] ✗ 対象 0 件（--from-ssot の絞り込みが一致しない、または --urls 未指定）。");
    process.exit(2);
  }

  const result = {
    schemaVersion: 1,
    runId,
    collectedAt: new Date().toISOString(),
    property: cfg.gsc.property,
    mode: opts.commit ? "commit" : "dry-run",
    scriptVersion: gitCommit(),
    filter: { category: opts.category, group: opts.group },
    limit: opts.limit,
    targetCount: slugs.length,
    items: [],
    status: "pending",
  };

  console.log(
    `GSC インデックス登録 [${result.mode}] 対象 ${slugs.length} 件（送信上限 ${opts.limit}）` +
      `${opts.category ? ` / category=${opts.category}` : ""}${opts.group ? ` group=${opts.group}` : ""}`,
  );
  if (!opts.commit) console.log("  （dry-run: URL 検査で診断するだけ。リクエストするには --commit）");

  const ctx = await launchContext(cfg, { headless: opts.headed ? false : cfg.browser.headless });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  let sent = 0;

  try {
    await page.goto(`${cfg.gsc.baseUrl}/index?resource_id=${encodeURIComponent(cfg.gsc.property)}`, {
      waitUntil: "domcontentloaded",
      timeout: cfg.browser.timeoutMs,
    });
    await page.waitForTimeout(3000);
    if (!(await isSignedInToGsc(page).catch(() => false))) {
      console.error("未ログインのため停止。`npm run google-console:login` を実行してください。");
      result.status = "not-signed-in";
      throw Object.assign(new Error("not-signed-in"), { handled: true });
    }
    await assertGscProperty(page, cfg).catch(async (e) => {
      await dumpFailure(page, cfg, runId, { step: "assert-property", expected: [cfg.gsc.property], message: e.message });
      result.status = "property-mismatch";
      throw Object.assign(e, { handled: true });
    });

    for (const slug of slugs) {
      const target = `${SITE}/docs/${slug}`;
      const item = { slug, url: target, inspected: null, request: null };
      const reached = await inspectViaSearchBar(page, cfg, target);
      item.reachedVerdict = reached;
      item.inspected = reached
        ? await readInspection(page)
        : { state: null, reason: null, lastCrawl: null, crawlAllowed: null, indexingAllowed: null };
      const st = item.inspected.state ?? "unknown";
      console.log(
        `  ${slug.padEnd(44)} state=${String(st).padEnd(22)} reason=${item.inspected.reason ?? "-"}` +
          ` crawl=${item.inspected.crawlAllowed ?? "?"} index=${item.inspected.indexingAllowed ?? "?"}`,
      );

      if (opts.commit) {
        if (st === "indexed") {
          item.request = { requested: false, status: "already-indexed" };
        } else if (sent >= opts.limit) {
          item.request = { requested: false, status: "limit-reached" };
        } else {
          item.request = await requestIndexing(page, cfg, runId, target);
          if (item.request.requested) sent += 1;
          console.log(`      → リクエスト: ${item.request.status}${item.request.detail ? "（" + item.request.detail + "）" : ""}`);
          if (item.request.status === "quota-exceeded") {
            console.log("      日次クォータ上限に到達。残りは次回へ回します。");
            result.items.push(item);
            break;
          }
        }
      }
      result.items.push(item);
    }

    const accepted = result.items.filter((i) => i.request?.requested).length;
    const alreadyIdx = result.items.filter((i) => i.inspected?.state === "indexed").length;
    const unknown = result.items.filter((i) => !i.inspected?.state).length;
    result.summary = { inspected: result.items.length, accepted, alreadyIndexed: alreadyIdx, unreadable: unknown };
    // 検査できなかった（state 不明）が支配的なら成功と呼ばない
    result.status = unknown > result.items.length / 2 ? "inspection-unreadable" : opts.commit ? (accepted > 0 ? "ok" : "no-requests") : "dry-ok";
  } catch (e) {
    if (!e.handled) {
      await dumpFailure(page, cfg, runId, { step: "unexpected", message: e?.message || String(e) });
      result.status = "error";
      result.error = String(e?.message || e).slice(0, 300);
    }
  } finally {
    await ctx.close();
  }

  writeFileSync(join(STATE_DIR, "requests-latest.json"), JSON.stringify(result, null, 2), "utf-8");
  const hp = join(STATE_DIR, "history.json");
  let hist = { schemaVersion: 1, runs: [] };
  if (existsSync(hp)) {
    try {
      const parsed = JSON.parse(readFileSync(hp, "utf8"));
      if (Array.isArray(parsed?.runs)) hist = parsed;
    } catch {
      /* 壊れていたら作り直す */
    }
  }
  hist.runs = hist.runs.filter((r) => r.runId !== runId);
  hist.runs.push({
    runId,
    collectedAt: result.collectedAt,
    mode: result.mode,
    status: result.status,
    filter: result.filter,
    ...result.summary,
    slugs: result.items.map((i) => i.slug),
  });
  hist.runs.sort((a, b) => String(a.runId).localeCompare(String(b.runId)));
  writeFileSync(hp, JSON.stringify(hist, null, 2), "utf-8");

  const s = result.summary ?? {};
  console.log(
    `\n完了: status=${result.status} / 検査 ${s.inspected ?? 0} 件（既に登録済み ${s.alreadyIndexed ?? 0}・` +
      `読めず ${s.unreadable ?? 0}）/ リクエスト受理 ${s.accepted ?? 0} 件`,
  );

  // 受理数だけを出すと「送れなかった分」が消える。実測（2026-08-04）で 20 件中 3 件が
  // button-not-found だったのに、サマリーは「受理 10 件」としか言わず失敗が見えなかった。
  // 送信を試みて受理に至らなかったものは必ず内訳で surface する（成功数だけを出さない）。
  // 判定は scripts/lib/report-honesty.mjs（純関数・tests/report-honesty.test.mjs で固定）。
  const failed = collectFailedRequests(result.items);
  if (failed.length > 0) {
    const byStatus = new Map();
    for (const i of failed) {
      byStatus.set(i.request.status, [...(byStatus.get(i.request.status) ?? []), i.slug]);
    }
    console.log(`\n⚠ 送信できなかった ${failed.length} 件（次回に持ち越し）:`);
    for (const [status, slugs] of byStatus) {
      console.log(`  ${status} (${slugs.length}): ${slugs.join(", ")}`);
    }
  }

  console.log(`記録: ${join(STATE_DIR, "requests-latest.json")}`);
  if (!opts.commit) console.log("実際にリクエストするには --commit を付けて再実行してください。");
  // 1 件でも送信に失敗していたら 0 で終わらない（緑を見て「全部送れた」と読ませない）。
  const clean = result.status === "ok" || result.status === "dry-ok";
  process.exit(clean && failed.length === 0 ? 0 : 2);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
