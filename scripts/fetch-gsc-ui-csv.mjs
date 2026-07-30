#!/usr/bin/env node
/**
 * fetch-gsc-ui-csv.mjs — GSC「ページのインデックス登録」理由別詳細から CSV を取得（ローカル専用）
 * ---------------------------------------------------------------------------
 * 永続 Chrome プロファイル（google-console-login.mjs でログイン済み）で GSC を開き、
 * All known pages / All submitted pages の両スコープについて、config の理由別ラベルの
 * 詳細画面へ入り、download イベントで CSV を保存する。
 *
 * CLI:
 *   node scripts/fetch-gsc-ui-csv.mjs --dry-run
 *   node scripts/fetch-gsc-ui-csv.mjs --issues crawledNotIndexed,redirect,notFound
 *   node scripts/fetch-gsc-ui-csv.mjs --issues all
 *   node scripts/fetch-gsc-ui-csv.mjs --issues all --headed
 *   node scripts/fetch-gsc-ui-csv.mjs --scope allSubmittedPages   # 片側のみ
 *
 * 安全弁:
 *   - selector は role/label/text 優先。CSS class を主経路にしない。
 *   - 候補が 0 件 or 複数件なら推測クリックせず debug dump→そのユニットを failed にして継続。
 *   - ダウンロードは必ず page.waitForEvent("download")。
 *   - 対象プロパティが一致しなければ全体を停止（PROPERTY_MISMATCH）。
 *   - --dry-run は DOM 検出のみ（download しない）。
 *   - GSC の例 URL は最大 1,000 件。uiTotal>1000 は truncated:true を manifest に明記。
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import {
  loadConfig,
  launchContext,
  isSignedInToGsc,
  assertGscProperty,
  dumpFailure,
  downloadTo,
  findUniqueByLabels,
  makeRunId,
  sha256File,
} from "./lib/google-console-browser.mjs";
import { parseCsv } from "./lib/google-console-csv.mjs";
import { judgeRun, formatRunSummary, exitCodeFor, buildMarker } from "./lib/google-console-units.mjs";

const STATE_DIR = ".claude/state/metrics/gsc-ui";

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { dryRun: false, headed: false, issues: "all", scope: "both" };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--dry-run") opts.dryRun = true;
    else if (a[i] === "--headed") opts.headed = true;
    else if (a[i] === "--issues") opts.issues = a[++i];
    else if (a[i] === "--scope") opts.scope = a[++i];
  }
  return opts;
}

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

/**
 * report URL を resource_id ＋ scope param 付きで組み立てる。
 * scope は GSC が URL に反映する（送信済み＝&pages=ALL_SUBMITTED_URLS&sitemap／既知＝既定）。
 * ドロップダウン操作より URL 直指定の方が決定的で、scope 切替後のドリルインも安定する。
 */
function indexReportUrl(cfg, scopeKey = "allKnownPages") {
  const rid = encodeURIComponent(cfg.gsc.property);
  const param = (cfg.gsc.scopeParams && cfg.gsc.scopeParams[scopeKey]) || "";
  return `${cfg.gsc.baseUrl}/index?resource_id=${rid}${param}`;
}

/** 画面上の「N 件」テキストから件数を推定（詳細画面のカウント）。取れなければ null。 */
async function readUiTotal(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  // 日本語: "1,234 件" / 英語: "1,234 pages"
  const m =
    body.match(/([\d,]+)\s*件/) || body.match(/([\d,]+)\s*pages?/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

/** ラベルの「現在可視な」要素を返す（トリガー特定用）。無ければ null。 */
async function visibleLabelEl(page, label) {
  const loc = page.getByText(label, { exact: true });
  const c = await loc.count().catch(() => 0);
  for (let i = 0; i < c; i++) {
    const el = loc.nth(i);
    if (await el.isVisible().catch(() => false)) return el;
  }
  return null;
}

/**
 * 対象スコープの report を **URL 直指定で開く**（ドロップダウン操作より決定的）。
 * GSC は scope を URL に反映する（送信済み＝&pages=ALL_SUBMITTED_URLS&sitemap）。
 * 開いたあと、対象スコープのラベルが可視トリガーになっているかを検証して true/false を返す。
 * fresh navigation なので scope 切替後もドリルインが安定する。
 */
async function selectScope(page, cfg, scopeKey) {
  const targetLabels = cfg.gsc.scopes[scopeKey];
  if (!targetLabels) return false;
  await page.goto(indexReportUrl(cfg, scopeKey), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
  // 理由テーブルがレンダされるまで待つ
  await page
    .getByText(targetLabels[0], { exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  // 検証: 対象スコープラベルが可視（＝そのスコープの report が開いている）
  for (const t of targetLabels) {
    if (await visibleLabelEl(page, t)) {
      if (process.env.GSC_DEBUG) console.error(`[scope] ${scopeKey} を URL で開いた（未登録=${await scopeUnregCount(page)}）`);
      return true;
    }
  }
  if (process.env.GSC_DEBUG) console.error(`[scope] ${scopeKey} 検証 NG（URL 直指定後もラベル未検出）`);
  return false;
}

/** 画面上の「未登録 N」件数（診断ログ用）。取れなければ null。 */
async function scopeUnregCount(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  const m = body.match(/未登録\s*([\d,]+)/) || body.match(/Not indexed\s*([\d,]+)/i);
  return m ? m[1].replace(/,/g, "") : null;
}

/**
 * 理由行をクリックして詳細へ。GSC の理由テーブルは非 ARIA で、各理由が
 * `td[data-string-value="<正式ラベル>"]`（1 セル/理由・安定 data 属性）。これを主経路にする。
 */
async function openIssueDetail(page, labels) {
  // 理由セル（td[data-string-value=正式ラベル]）を探す。
  const findCell = async () => {
    for (const label of labels) {
      const loc = page.locator(`td[data-string-value="${label}"]`);
      if ((await loc.count().catch(() => 0)) >= 1) return { loc: loc.first(), label };
    }
    return null;
  };
  let found = await findCell();
  let matchedLabel = found?.label ?? null;
  if (!found) {
    // フォールバック: role=link/button の厳密名一致
    const g = await findUniqueByLabels(page, labels, { roles: ["link", "button"] });
    if (!g.locator) return { ok: false, candidateCount: g.count, drilled: false };
    found = { loc: g.locator, label: labels[0] };
    matchedLabel = labels[0];
  }
  // クリック前にサマリー行の件数（ページ数列＝行末の数値）を取得
  let rowCount = null;
  try {
    const rowText = await found.loc.locator("xpath=ancestor::tr[1]").innerText();
    const nums = rowText.replace(/,/g, "").match(/\d+/g);
    if (nums && nums.length) rowCount = parseInt(nums[nums.length - 1], 10);
  } catch {}
  // ドリルイン（最大 2 回）。理由行クリックで URL が /index → /index/drilldown（item_key 付き）へ
  // 変わるのが確実な detail 遷移シグナル。理由ラベルは drilldown ページにも残るので使わない。
  let drilled = false;
  for (let attempt = 0; attempt < 2 && !drilled; attempt++) {
    const cell = (await findCell())?.loc || found.loc;
    const beforeUrl = page.url();
    await cell.click().catch(() => {});
    await page.waitForTimeout(2200);
    const afterUrl = page.url();
    drilled = /\/drilldown|item_key=/.test(afterUrl) && afterUrl !== beforeUrl;
    if (!drilled) {
      if (process.env.GSC_DEBUG) console.error(`[drill] ${matchedLabel} 未ドリル（try ${attempt + 1}・url=${afterUrl.slice(-40)}）`);
      await page.waitForTimeout(900);
    }
  }
  // 例 URL 表のレンダ待ち（export が空/summary にならないように）
  if (drilled) await page.waitForTimeout(1800);
  return { ok: drilled, matchedLabel, candidateCount: 1, rowCount, drilled };
}

/**
 * 最小 ZIP リーダー（依存なし・ファイル名非依存）。
 * GSC の ZIP はメンバー名が非 UTF-8（Info-ZIP 化け）で `unzip` が macOS FS に書けない
 * （Illegal byte sequence）。そこで central directory を自前でパースし、各メンバーを
 * inflateRawSync（deflate）/ stored でメモリ展開してテキスト配列で返す。名前は一切使わない。
 */
function unzipMemberTexts(buf) {
  const out = [];
  // End Of Central Directory (0x06054b50) を末尾から探す
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return out;
  const cdCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  let p = cdOffset;
  for (let n = 0; n < cdCount && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break; // central directory header
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    // local header（可変長 name/extra を跨いでデータ先頭へ）
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    let data = null;
    if (method === 0) data = comp; // stored
    else if (method === 8) {
      try {
        data = inflateRawSync(comp);
      } catch {
        data = null;
      }
    }
    if (data) out.push(data.toString("utf-8"));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/**
 * ZIP から「URL を最も多く含む CSV（＝表）」を取り出し outCsvPath へ書き出す。展開不能なら null。
 * GSC の CSV ダウンロードは 表 + チャート等の複数 CSV を ZIP で返すため、名前ではなく内容で表を選ぶ。
 */
function extractTableCsvFromZip(zipPath, outCsvPath) {
  try {
    const texts = unzipMemberTexts(readFileSync(zipPath));
    if (!texts.length) return null;
    let best = null;
    let bestScore = -1;
    for (const t of texts) {
      const score = (t.match(/https?:\/\//g) || []).length;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (best == null) return null;
    writeFileSync(outCsvPath, best, "utf-8");
    return outCsvPath;
  } catch {
    return null;
  }
}

/** 詳細画面の Export ボタンを一意取得。GSC は div[aria-label="エクスポート"][aria-haspopup]。 */
async function findExportButton(page, cfg) {
  for (const label of cfg.gsc.exportButtonLabels) {
    const byAria = page.locator(`[aria-label="${label}"]:visible`);
    const c = await byAria.count().catch(() => 0);
    if (c === 1) return { locator: byAria, count: 1 };
    if (c > 1) return { locator: null, count: c };
  }
  return findUniqueByLabels(page, cfg.gsc.exportButtonLabels, { roles: ["button", "link"] });
}

/** エクスポートメニュー内の CSV 項目を一意取得（menuitem / data 属性 / aria-label / text の順）。 */
async function findCsvMenuItem(page, labels) {
  for (const label of labels) {
    for (const sel of [
      `[role="menuitem"][aria-label="${label}"]`,
      `[data-string-value="${label}"]:visible`,
      `[aria-label="${label}"]:visible`,
    ]) {
      const loc = page.locator(sel);
      if ((await loc.count().catch(() => 0)) === 1) return { locator: loc, count: 1 };
    }
    const byRole = page.getByRole("menuitem", { name: label, exact: false });
    if ((await byRole.count().catch(() => 0)) === 1) return { locator: byRole, count: 1 };
    const byText = page.getByText(label, { exact: false });
    if ((await byText.count().catch(() => 0)) === 1) return { locator: byText, count: 1 };
  }
  return { locator: null, count: 0 };
}

async function main() {
  const opts = parseArgs();
  const cfg = loadConfig();
  const runId = makeRunId();
  const runDir = join(STATE_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  const issueKeys =
    opts.issues === "all"
      ? Object.keys(cfg.gsc.issueLabels)
      : opts.issues.split(",").map((s) => s.trim()).filter(Boolean);

  const scopeKeys =
    opts.scope === "both" ? ["allKnownPages", "allSubmittedPages"] : [opts.scope];

  const manifest = {
    schemaVersion: 1,
    runId,
    collectedAt: new Date().toISOString(),
    property: cfg.gsc.property,
    mode: opts.dryRun ? "dry-run" : "fetch",
    browserHeadless: !opts.headed && cfg.browser.headless,
    scriptVersion: gitCommit(),
    reportUrl: indexReportUrl(cfg),
    units: [],
    dryRun: opts.dryRun ? { property: false, pageIndexingReachable: false, issues: {} } : undefined,
  };

  console.log(`GSC UI CSV 取得 [${manifest.mode}] issues=${issueKeys.join(",")} scope=${scopeKeys.join(",")}`);
  const ctx = await launchContext(cfg, { headless: opts.headed ? false : cfg.browser.headless });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  try {
    await page.goto(indexReportUrl(cfg), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs });
    await page.waitForTimeout(2000);

    if (!(await isSignedInToGsc(page).catch(() => false))) {
      await dumpFailure(page, cfg, runId, {
        step: "signed-in-check",
        expected: ["GSC 本体（検索パフォーマンス等）が可視"],
        message: "未ログイン。先に `npm run google-console:login` を実行してください。",
      });
      console.error("未ログインのため停止しました。`npm run google-console:login` を実行してください。");
      bail(manifest, runDir, "not-signed-in", 3);
    }

    // 対象プロパティ assert（不一致なら全体停止）
    try {
      await assertGscProperty(page, cfg);
      if (manifest.dryRun) manifest.dryRun.property = true;
    } catch (e) {
      await dumpFailure(page, cfg, runId, {
        step: "assert-property",
        expected: [cfg.gsc.property],
        message: e.message,
      });
      console.error(`プロパティ不一致で停止: ${e.message}`);
      bail(manifest, runDir, "property-mismatch", 5);
    }

    // Page indexing レポートへ到達しているか（理由テーブルの存在で判定）
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const reachable =
      /ページのインデックス登録|Page indexing|インデックス未登録|not indexed/i.test(bodyText);
    if (manifest.dryRun) manifest.dryRun.pageIndexingReachable = reachable;
    if (!reachable) {
      await dumpFailure(page, cfg, runId, {
        step: "reach-page-indexing",
        expected: ["ページのインデックス登録 / Page indexing レポート"],
        message: "Page indexing レポートに到達できません（UI 変更の可能性）。",
      });
      console.error("Page indexing レポートに到達できませんでした。debug artifact を確認してください。");
      bail(manifest, runDir, "page-indexing-unreachable", 6);
    }

    for (const scopeKey of scopeKeys) {
      const scopeSwitched = await selectScope(page, cfg, scopeKey);
      if (!scopeSwitched) {
        // 対象スコープへ確実に切替できないときは、既定スコープのデータを誤ラベルしないよう
        // このスコープの全 issue を skip として記録する（データ取り違え防止）。
        console.warn(`[warn] scope 切替を検証できず: ${scopeKey} → このスコープは skip（誤ラベル防止）`);
        for (const issueKey of issueKeys) {
          manifest.units.push({
            issueKey,
            issueLabel: (cfg.gsc.issueLabels[issueKey] || [issueKey])[0],
            scope: scopeKey,
            status: "scope-switch-failed",
            error: "対象スコープへ切替/検証できず（誤ラベル防止のため skip）",
            rawFile: null,
            csvRows: null,
          });
        }
        continue;
      }
      for (const issueKey of issueKeys) {
        const labels = cfg.gsc.issueLabels[issueKey];
        if (!labels) {
          console.warn(`[warn] 未知の issue key: ${issueKey}（config に無し・スキップ）`);
          continue;
        }
        const unit = await processUnit(page, cfg, runId, runDir, {
          issueKey,
          labels,
          scopeKey,
          dryRun: opts.dryRun,
          headless: !opts.headed && cfg.browser.headless,
        });
        manifest.units.push(unit);
        if (manifest.dryRun) {
          manifest.dryRun.issues[`${scopeKey}:${issueKey}`] = {
            rowDetected: unit.status !== "row-not-found",
            exportButtonUnique: unit.exportButtonUnique ?? null,
            csvMenuDetected: unit.csvMenuDetected ?? null,
          };
        }
        // 次の理由行へ: 対象スコープの report を URL 直指定で開き直す（selectScope が goto＋描画待ち）
        await selectScope(page, cfg, scopeKey);
      }
    }

    manifest.loopCompleted = true;
  } catch (e) {
    await dumpFailure(page, cfg, runId, { step: "unexpected", message: e?.message || String(e) });
    manifest.fatalStatus = "error";
    manifest.error = String(e?.message || e).slice(0, 300);
  } finally {
    await ctx.close();
  }

  // status は「例外が出なかったか」ではなく **ユニットの完全性**で決める（旧実装は無条件で "ok"）。
  const judged = judgeRun({ units: manifest.units, fatalStatus: manifest.fatalStatus });
  manifest.status = judged.status;
  manifest.completeness = judged;
  finalize(manifest, runDir);
  // 継続運用マーカー（committed・URL データは含めない）。cloud 週次 PDCA の due-surfacer が読む。
  if (!opts.dryRun) writeLastRunMarker(manifest, judged);
  console.log(`\n${formatRunSummary(judged, "完了")}`);
  for (const f of judged.failedDetail) console.log(`  [failed] ${f.unit} status=${f.status} ${f.error ?? ""}`);
  console.log(`manifest: ${join(runDir, "manifest.json")}`);
  // 不完全な取得を exit 0 にしない（呼出側＝search-growth:audit の && 連鎖をここで止める）。
  process.exit(exitCodeFor(judged));
}

/**
 * run を中断して終了する（未ログイン・プロパティ不一致・レポート到達不能）。
 * マーカーは **complete:false で書く**＝失敗を記録しつつ月次サイクルの時計をリセットさせない
 * （due 判定は日数だけでなく complete も見る。check-gsc-ui-due 参照）。
 */
function bail(manifest, runDir, status, exitCode) {
  const judged = judgeRun({ units: manifest.units, fatalStatus: status });
  manifest.status = judged.status;
  manifest.completeness = judged;
  finalize(manifest, runDir);
  if (manifest.mode !== "dry-run") writeLastRunMarker(manifest, judged);
  console.error(formatRunSummary(judged, "中断"));
  process.exit(exitCode);
}

/**
 * 最新取得マーカーを STATE_DIR 直下に書く（run 生データは gitignore・これだけ commit する）。
 * 失敗 run が直前の成功記録を消さないよう、既存マーカーを読んで lastComplete を引き継ぐ。
 */
function writeLastRunMarker(manifest, judged) {
  const path = join(STATE_DIR, "last-run.json");
  let prev = null;
  try {
    prev = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    prev = null;
  }
  const marker = buildMarker({
    prev,
    channel: "gsc-ui",
    runId: manifest.runId,
    collectedAt: manifest.collectedAt,
    judged,
    extra: { property: manifest.property },
    note: "GSC UI CSV 取得の実行マーカー（URL データは含めない）。lastAttempt=最後の実行 / lastComplete=最後に完全だった実行。check-gsc-ui-due が参照。lastAttempt.complete=false は「再取得が必要」。",
  });
  try {
    writeFileSync(path, JSON.stringify(marker, null, 2), "utf-8");
  } catch {
    /* マーカー書込失敗は取得本体を妨げない */
  }
}

/** 1 スコープ×1 理由の処理。dry-run は検出のみ、通常は download。 */
async function processUnit(page, cfg, runId, runDir, { issueKey, labels, scopeKey, dryRun, headless }) {
  const base = {
    issueKey,
    issueLabel: labels[0],
    scope: scopeKey,
    locale: null,
    reportUrl: page.url(),
    uiTotal: null,
    csvRows: null,
    truncated: false,
    rawFile: null,
    sha256: null,
    status: "pending",
    error: null,
  };

  // 理由行を開く
  const detail = await openIssueDetail(page, labels);
  if (!detail.ok) {
    if (detail.candidateCount > 1) {
      await dumpFailure(page, cfg, runId, {
        step: "open-issue-detail",
        expected: labels,
        message: `理由行の候補が複数 (${detail.candidateCount})。推測クリックせず停止。`,
        candidateCount: detail.candidateCount,
      });
      base.status = "ambiguous-row";
      base.error = `候補数 ${detail.candidateCount}`;
    } else if (detail.candidateCount === 1 && detail.drilled === false) {
      // 理由行はあったが detail に入れなかった＝summary を誤 export しないよう停止
      await dumpFailure(page, cfg, runId, {
        step: "drilldown",
        expected: [`${labels[0]} の詳細（例 URL 表）`],
        message: "理由行クリックで詳細へ遷移できず（summary の誤 export を防止）。",
      });
      base.status = "drilldown-failed";
      base.error = "detail へ未遷移";
    } else {
      base.status = "row-not-found"; // 件数 0 = 該当なし（そのスコープに当該理由が無い）or UI 変更
      base.error = `候補数 ${detail.candidateCount}`;
    }
    return base;
  }
  base.locale = /[^\x00-\x7F]/.test(detail.matchedLabel || "") ? "ja" : "en";
  base.reportUrl = page.url();
  base.uiTotal = detail.rowCount ?? (await readUiTotal(page));
  const cap = cfg.gsc.sampleUrlCap || 1000;
  base.truncated = base.uiTotal != null && base.uiTotal > cap;

  // Export ボタンの一意性
  const exportBtn = await findExportButton(page, cfg);
  base.exportButtonUnique = exportBtn.count === 1;
  if (!exportBtn.locator) {
    await dumpFailure(page, cfg, runId, {
      step: "find-export-button",
      expected: cfg.gsc.exportButtonLabels,
      message: `Export ボタン候補が ${exportBtn.count} 件（一意でない）。停止。`,
      candidateCount: exportBtn.count,
    });
    base.status = "export-button-ambiguous";
    base.error = `export候補 ${exportBtn.count}`;
    return base;
  }

  // Export メニューを開き、CSV 項目の存在を検出
  await exportBtn.locator.click().catch(() => {});
  await page.waitForTimeout(900);
  const csvItem = await findCsvMenuItem(page, cfg.gsc.csvMenuLabels);
  base.csvMenuDetected = !!csvItem.locator;

  if (dryRun) {
    // 検出のみ。メニューを閉じて終了。
    await page.keyboard.press("Escape").catch(() => {});
    if (!csvItem.locator) {
      base.status = "csv-menu-not-found";
      base.error = `csv候補 ${csvItem.count}`;
    } else {
      base.status = "dry-ok";
    }
    return base;
  }

  // 実ダウンロード
  if (!csvItem.locator) {
    await dumpFailure(page, cfg, runId, {
      step: "select-csv-export",
      expected: cfg.gsc.csvMenuLabels,
      message: `CSV メニュー項目が ${csvItem.count} 件（一意でない）。停止。`,
      candidateCount: csvItem.count,
    });
    base.status = "csv-menu-ambiguous";
    base.error = `csv候補 ${csvItem.count}`;
    return base;
  }

  const stem = `${issueKey}--${scopeKey}--${runId}`;
  const csvName = `${stem}.csv`;
  const csvPath = join(runDir, csvName);
  const dlPath = join(runDir, `${stem}.download`);
  try {
    const dl = await downloadTo(page, () => csvItem.locator.click(), dlPath, { timeout: 90000 });
    base.archiveSha256 = dl.sha256; // 生ダウンロード（ZIP or CSV）の integrity
    if (dl.bytes < 3) {
      base.status = "empty-download";
      base.error = `bytes=${dl.bytes}`;
      return base;
    }
    // 先頭 2 バイトで ZIP 判定（GSC は複数 CSV を ZIP で返す）
    const head = readFileSync(dlPath).subarray(0, 2).toString("latin1");
    if (head === "PK") {
      const zipName = `${stem}.zip`;
      renameSync(dlPath, join(runDir, zipName));
      base.archiveFile = zipName;
      base.format = "zip";
      const ok = extractTableCsvFromZip(join(runDir, zipName), csvPath);
      if (!ok) {
        base.status = "zip-no-table";
        base.error = "ZIP 内に URL 表 CSV が見つからない";
        return base;
      }
    } else {
      renameSync(dlPath, csvPath);
      base.format = "csv";
    }
    base.rawFile = csvName;
    base.sha256 = sha256File(csvPath); // 正規化が読む CSV の integrity
    const { headers, rows } = parseCsv(readFileTextSafe(csvPath));
    base.csvRows = rows.length;
    base.csvHeaders = headers;
    if (rows.length >= cap) base.truncated = true;
    base.status = "downloaded";
  } catch (e) {
    await dumpFailure(page, cfg, runId, {
      step: "download-csv",
      expected: ["download イベント発火 + CSV 保存"],
      message: e?.message || String(e),
    });
    base.status = "download-failed";
    base.error = String(e?.message || e).slice(0, 200);
  }
  return base;
}

function readFileTextSafe(p) {
  try {
    return existsSync(p) ? readFileSync(p, "utf-8") : "";
  } catch {
    return "";
  }
}

function finalize(manifest, runDir) {
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
