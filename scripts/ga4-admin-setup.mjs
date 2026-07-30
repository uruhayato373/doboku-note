#!/usr/bin/env node
/**
 * ga4-admin-setup.mjs — GA4 管理画面の設定を desired state と突合し、不足を作成する（ローカル専用）
 * ---------------------------------------------------------------------------
 * なぜ必要か: `fetch-ga4-cta-clicks -- --by-label` / `--by-placement` は GA4 の
 * **イベントスコープ カスタムディメンション**（event_label / cta_placement）が登録済みでないと
 * Data API が dimension 不明で失敗する。実装側は登録手順を出して exit 0 するため、CI は緑のまま
 * 「その指標だけ永久に取れない」状態が続いていた（プログラム別 EPC・配置別 CTR が測れない）。
 * 管理画面設定は API（Admin API）でも可能だが、この口座はサービスアカウントに編集権を与えていない
 * ため、ログイン済みプロファイルのブラウザ操作で **観測 → 差分 → 作成** を回す。
 *
 * 望ましい状態の SSOT: .claude/config/ga4-admin-desired-state.json
 * 観測結果の SSOT:     .claude/state/metrics/ga4-admin/inventory-latest.json（追跡）
 *                      .claude/state/metrics/ga4-admin/last-run.json（追跡・マーカー）
 *
 * CLI:
 *   node scripts/ga4-admin-setup.mjs                 # 観測のみ（dry-run 既定）。差分を出して終了
 *   node scripts/ga4-admin-setup.mjs --commit        # 不足しているカスタムディメンションを実際に作成
 *   node scripts/ga4-admin-setup.mjs --headed        # ブラウザを表示（トラブルシュート）
 *   node scripts/ga4-admin-setup.mjs --only event_label
 *
 * 安全弁（収益アカウントの設定面を触るため厳しめ）:
 *   - **既定は dry-run**。作成は --commit を明示したときのみ（draft-first と同じ考え方）。
 *   - **作成のみ**。既存ディメンションの編集・アーカイブ・削除は一切しない（UI 上のそれらは押さない）。
 *   - property は URL の p{propertyId} で決定的に指定し、画面側でも assert。不一致なら 1 件も触らず停止。
 *   - 未ログイン・CAPTCHA・UI 変更（候補 0 件 or 複数件）では推測クリックせず debug dump して停止。
 *   - dataRetention / unwantedReferrals は **観測して差分を報告するだけ**（autoFix:false を強制）。
 *   - 作成後は一覧を再読込して「実際に増えたか」を確認する（自己申告で成功と言わない）。
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { loadConfig, launchContext, dumpFailure, findUniqueByLabels, makeRunId } from "./lib/google-console-browser.mjs";

const STATE_DIR = ".claude/state/metrics/ga4-admin";
const DESIRED_PATH = ".claude/config/ga4-admin-desired-state.json";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { commit: false, headed: false, only: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--commit") o.commit = true;
    else if (a[i] === "--headed") o.headed = true;
    else if (a[i] === "--only") o.only = a[++i];
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

const SCOPE_LABELS = { EVENT: ["イベント", "Event"], USER: ["ユーザー", "User"], ITEM: ["商品", "Item"] };

function customDefinitionsUrl(propertyId) {
  return `https://analytics.google.com/analytics/web/#/p${propertyId}/admin/customdefinitions/hierarchy`;
}
function dataRetentionUrl(propertyId) {
  return `https://analytics.google.com/analytics/web/#/p${propertyId}/admin/dataretention`;
}

/** URL と画面テキストの両方で property を確認する（取り違え防止）。 */
async function assertProperty(page, propertyId) {
  const url = page.url();
  if (url.includes(`/p${propertyId}`)) return true;
  const body = await page.locator("body").innerText().catch(() => "");
  if (body.includes(propertyId)) return true;
  const err = new Error(`GA4 property ${propertyId} が URL/画面に見当たりません（現在: ${url}）`);
  err.code = "GA4_PROPERTY_MISMATCH";
  throw err;
}

async function isSignedIn(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  if (/ログイン|Sign in to continue|アカウントを選択/.test(body) && !/カスタム定義|Custom definitions/.test(body)) {
    return false;
  }
  return /Google アナリティクス|Google Analytics|カスタム定義|Custom definitions|管理/.test(body);
}

/**
 * カスタムディメンション一覧を読む。
 * 行の DOM 構造は変わりやすいので、表のテキスト行を取って「表示名 / パラメータ名 / 範囲」を抽出する。
 * 抽出できた行が 0 件でも「登録が 0 件」と断定はせず、テーブル自体の存在で区別する（§9 の考え方）。
 */
async function readCustomDimensions(page) {
  const tableVisible = await page
    .getByText(/カスタム ディメンション|カスタムディメンション|Custom dimensions/)
    .first()
    .isVisible()
    .catch(() => false);

  const rows = await page
    .locator("table tr, [role='row']")
    .allInnerTexts()
    .catch(() => []);

  const parsed = [];
  for (const raw of rows) {
    const cells = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    // 見出し行は除外
    if (/^(ディメンション名|Dimension name|表示名)/.test(cells[0])) continue;
    const scopeCell = cells.find((c) => /^(イベント|ユーザー|商品|Event|User|Item)$/.test(c));
    const paramCell = cells.find((c) => /^[a-z0-9_]{2,40}$/i.test(c) && c !== cells[0]);
    if (!scopeCell && !paramCell) continue;
    parsed.push({
      displayName: cells[0],
      parameterName: paramCell ?? null,
      scopeLabel: scopeCell ?? null,
      rawCells: cells,
    });
  }
  return { tableVisible, dimensions: parsed, rawRowCount: rows.length };
}

/** desired と実機 inventory の差分。パラメータ名（大文字小文字無視）で照合する。 */
function diffDimensions(desired, inventory) {
  const have = new Map(
    (inventory.dimensions ?? [])
      .filter((d) => d.parameterName)
      .map((d) => [d.parameterName.toLowerCase(), d]),
  );
  const missing = [];
  const present = [];
  for (const d of desired) {
    const found = have.get(d.parameterName.toLowerCase());
    if (found) present.push({ ...d, observed: found });
    else missing.push(d);
  }
  return { missing, present };
}

/**
 * 1 件のカスタムディメンションを作成する。
 * 「新しいカスタム ディメンション」→ 表示名 / 範囲 / イベントパラメータ / 説明 → 保存。
 * 候補が一意に取れないステップでは推測クリックせず throw する。
 */
async function createDimension(page, cfg, runId, def) {
  const newBtn = await findUniqueByLabels(page, ["カスタム ディメンションを作成", "新しいカスタム ディメンション", "Create custom dimension", "Create custom dimensions"]);
  if (!newBtn.locator) {
    throw Object.assign(new Error(`作成ボタン候補が ${newBtn.count} 件（一意でない）`), { step: "find-create-button", count: newBtn.count });
  }
  await newBtn.locator.click();
  await page.waitForTimeout(1200);

  // 表示名
  const nameBox = page.getByLabel(/ディメンション名|Dimension name|表示名/).first();
  if (!(await nameBox.isVisible().catch(() => false))) {
    throw Object.assign(new Error("ディメンション名の入力欄が見つからない"), { step: "fill-display-name" });
  }
  await nameBox.fill(def.displayName);

  // 範囲（既定はイベント。desired が EVENT 以外なら明示選択）
  if (def.scope && def.scope !== "EVENT") {
    const scopeBox = page.getByLabel(/範囲|Scope/).first();
    if (await scopeBox.isVisible().catch(() => false)) {
      await scopeBox.click();
      await page.waitForTimeout(500);
      const label = (SCOPE_LABELS[def.scope] ?? [def.scope])[0];
      const opt = await findUniqueByLabels(page, SCOPE_LABELS[def.scope] ?? [def.scope]);
      if (!opt.locator) throw Object.assign(new Error(`範囲 ${label} の候補が ${opt.count} 件`), { step: "select-scope" });
      await opt.locator.click();
      await page.waitForTimeout(400);
    }
  }

  // 説明（任意）
  const descBox = page.getByLabel(/説明|Description/).first();
  if (await descBox.isVisible().catch(() => false)) {
    await descBox.fill(def.description ?? "");
  }

  // イベントパラメータ
  const paramBox = page.getByLabel(/イベント パラメータ|イベントパラメータ|Event parameter|パラメータ/).first();
  if (!(await paramBox.isVisible().catch(() => false))) {
    throw Object.assign(new Error("イベントパラメータの入力欄が見つからない"), { step: "fill-parameter" });
  }
  await paramBox.fill(def.parameterName);
  await page.waitForTimeout(600);

  // 保存
  const saveBtn = await findUniqueByLabels(page, ["保存", "Save"]);
  if (!saveBtn.locator) {
    throw Object.assign(new Error(`保存ボタン候補が ${saveBtn.count} 件（一意でない）`), { step: "find-save", count: saveBtn.count });
  }
  await saveBtn.locator.click();
  await page.waitForTimeout(2500);
}

/** データ保持の観測（変更はしない）。取れなければ null（不明として記録する）。 */
async function readDataRetention(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  const m = body.match(/(\d+)\s*か月|(\d+)\s*months?/i);
  const months = m ? parseInt(m[1] ?? m[2], 10) : null;
  return { months, resetOnNewActivityDetected: /新しいアクティビティ|Reset user data on new activity/i.test(body) || null };
}

async function main() {
  const opts = parseArgs();
  const cfg = loadConfig();
  const desired = JSON.parse(readFileSync(DESIRED_PATH, "utf-8"));
  const propertyId = desired.propertyId || cfg.ga4.propertyId;
  if (String(propertyId) !== String(cfg.ga4.propertyId)) {
    console.error(
      `[ga4-admin] ✗ propertyId 不一致: desired-state=${propertyId} / google-console-automation.json=${cfg.ga4.propertyId}。SSOT を揃えてください。`,
    );
    process.exit(5);
  }

  const runId = makeRunId();
  mkdirSync(STATE_DIR, { recursive: true });

  let wanted = desired.customDimensions ?? [];
  if (opts.only) wanted = wanted.filter((d) => d.parameterName === opts.only || d.displayName === opts.only);

  const result = {
    schemaVersion: 1,
    runId,
    collectedAt: new Date().toISOString(),
    propertyId,
    mode: opts.commit ? "commit" : "dry-run",
    scriptVersion: gitCommit(),
    status: "pending",
    desiredCount: wanted.length,
    inventory: null,
    missing: [],
    present: [],
    created: [],
    createFailures: [],
    dataRetention: { desired: desired.dataRetention ?? null, observed: null, drift: null },
    note: "GA4 管理画面の観測＋不足カスタムディメンションの作成。既定は dry-run（--commit で作成）。編集/アーカイブ/削除はしない。",
  };

  // §9: 検査対象 0 件を成功にしない。
  if (wanted.length === 0) {
    console.error(`[ga4-admin] ✗ 対象 0 件（desired-state の customDimensions が空 or --only が一致しない）。`);
    result.status = "no-targets";
    writeFileSync(join(STATE_DIR, "inventory-latest.json"), JSON.stringify(result, null, 2), "utf-8");
    process.exit(2);
  }

  console.log(
    `GA4 管理画面 設定チェック [${result.mode}] property=${propertyId} / desired カスタムディメンション ${wanted.length} 件`,
  );
  if (!opts.commit) console.log("  （dry-run: 差分を出すだけ。作成するには --commit を付ける）");

  const ctx = await launchContext(cfg, { headless: opts.headed ? false : cfg.browser.headless });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  try {
    await page.goto(customDefinitionsUrl(propertyId), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs });
    await page.waitForTimeout(4000);

    if (!(await isSignedIn(page))) {
      await dumpFailure(page, cfg, runId, {
        step: "signed-in-check",
        expected: ["GA4 管理画面（カスタム定義）が可視"],
        message: "未ログイン。先に `npm run google-console:login` を実行してください。",
      });
      result.status = "not-signed-in";
      throw Object.assign(new Error("not-signed-in"), { handled: true });
    }

    await assertProperty(page, propertyId).catch(async (e) => {
      await dumpFailure(page, cfg, runId, { step: "assert-property", expected: [String(propertyId)], message: e.message });
      result.status = "property-mismatch";
      throw Object.assign(e, { handled: true });
    });

    const inventory = await readCustomDimensions(page);
    result.inventory = inventory;
    if (!inventory.tableVisible) {
      await dumpFailure(page, cfg, runId, {
        step: "read-custom-dimensions",
        expected: ["カスタム ディメンション 表"],
        message: "カスタム定義の表に到達できません（UI 変更の可能性）。1 件も作成せず停止。",
      });
      result.status = "custom-definitions-unreachable";
      throw Object.assign(new Error("custom-definitions-unreachable"), { handled: true });
    }

    const { missing, present } = diffDimensions(wanted, inventory);
    result.missing = missing.map((d) => d.parameterName);
    result.present = present.map((d) => d.parameterName);
    console.log(
      `  観測: 一覧 ${inventory.dimensions.length} 件 / desired ${wanted.length} 件のうち 登録済み ${present.length}・不足 ${missing.length}`,
    );
    for (const d of missing) console.log(`    [missing] ${d.parameterName}（${d.blocking ? "blocking" : "optional"}）— ${(d.requiredBy ?? []).join(", ")}`);

    if (missing.length > 0 && opts.commit) {
      for (const def of missing) {
        try {
          await createDimension(page, cfg, runId, def);
          result.created.push(def.parameterName);
          console.log(`    [created] ${def.parameterName}`);
        } catch (e) {
          await dumpFailure(page, cfg, runId, {
            step: e.step ?? "create-dimension",
            expected: [def.parameterName],
            message: e.message,
            candidateCount: e.count,
          });
          result.createFailures.push({ parameterName: def.parameterName, step: e.step ?? null, message: e.message });
          console.error(`    [create-failed] ${def.parameterName}: ${e.message}`);
        }
        // 次の作成のため一覧へ戻る
        await page.goto(customDefinitionsUrl(propertyId), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
        await page.waitForTimeout(3000);
      }
      // 自己申告で成功としない: 一覧を読み直して実際に増えたかを確認する
      const after = await readCustomDimensions(page);
      const verify = diffDimensions(wanted, after);
      result.inventory = after;
      result.missingAfter = verify.missing.map((d) => d.parameterName);
      if (verify.missing.length > 0) {
        console.error(`  [verify] 作成後もまだ不足: ${result.missingAfter.join(", ")}`);
      } else {
        console.log("  [verify] desired の全カスタムディメンションが一覧に存在");
      }
    }

    // データ保持は観測のみ（autoFix は強制的に無効）
    await page.goto(dataRetentionUrl(propertyId), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
    await page.waitForTimeout(2500);
    const observedRetention = await readDataRetention(page);
    result.dataRetention.observed = observedRetention;
    const wantMonths = desired.dataRetention?.eventDataRetentionMonths ?? null;
    if (wantMonths != null && observedRetention.months != null && observedRetention.months !== wantMonths) {
      result.dataRetention.drift = `観測 ${observedRetention.months} か月 / 期待 ${wantMonths} か月`;
      console.log(`  [drift] データ保持: ${result.dataRetention.drift}（自動変更しない・管理画面で人が変更）`);
    }

    const missingNow = result.missingAfter ?? result.missing;
    const blockingMissing = wanted.filter((d) => d.blocking && missingNow.includes(d.parameterName));
    result.status =
      result.createFailures.length > 0
        ? "partial"
        : blockingMissing.length > 0
          ? opts.commit
            ? "partial"
            : "drift"
          : "ok";
  } catch (e) {
    if (!e.handled) {
      await dumpFailure(page, cfg, runId, { step: "unexpected", message: e?.message || String(e) });
      result.status = "error";
      result.error = String(e?.message || e).slice(0, 300);
    }
  } finally {
    await ctx.close();
  }

  // 追跡する成果物は 2 つだけ（run ごとのファイルは増え続けるので作らない）:
  //   inventory-latest.json … 最新の観測＋差分（check-ga4-custom-dimensions が読む SSOT）
  //   history.json          … run 別の要約（いつ何が不足/作成されたか）
  writeFileSync(join(STATE_DIR, "inventory-latest.json"), JSON.stringify(result, null, 2), "utf-8");
  const histPath = join(STATE_DIR, "history.json");
  let hist = { schemaVersion: 1, channel: "ga4-admin", runs: [] };
  if (existsSync(histPath)) {
    try {
      const parsed = JSON.parse(readFileSync(histPath, "utf-8"));
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
    desiredCount: result.desiredCount,
    presentCount: result.present.length,
    missing: result.missingAfter ?? result.missing,
    created: result.created,
    createFailures: result.createFailures.map((f) => f.parameterName),
    dataRetentionDrift: result.dataRetention.drift,
  });
  hist.runs.sort((a, b) => String(a.runId).localeCompare(String(b.runId)));
  writeFileSync(histPath, JSON.stringify(hist, null, 2), "utf-8");

  const missingNow = result.missingAfter ?? result.missing;
  console.log(
    `\n完了: status=${result.status} / desired ${result.desiredCount} 件中 登録済み ${result.present.length}・不足 ${missingNow.length}・作成 ${result.created.length}・作成失敗 ${result.createFailures.length}`,
  );
  console.log(`inventory: ${join(STATE_DIR, "inventory-latest.json")}`);
  if (!opts.commit && missingNow.length > 0) {
    console.log(`不足を作成するには: node scripts/ga4-admin-setup.mjs --commit`);
  }
  // ok 以外は非 0（drift を緑にしない）
  process.exit(result.status === "ok" ? 0 : 2);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
