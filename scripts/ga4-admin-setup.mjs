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
import {
  loadConfig,
  launchContext,
  dumpFailure,
  findUniqueByLabels,
  makeRunId,
  assertGa4Property,
  ga4RoutePrefix,
} from "./lib/google-console-browser.mjs";

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
const GA4_BASE = "https://analytics.google.com/analytics/web/";

/**
 * GA4 の hash ルートは `a<account>p<property>` で正規化される。`p<property>` だけで管理画面へ
 * 直接飛ぶと GA4 がホームへ戻してしまうため、**まずホームを開いて接頭辞を確定**してから深いルートへ行く。
 */
function homeUrl(propertyId) {
  return `${GA4_BASE}#/p${propertyId}/reports/intelligenthome`;
}
// 実機の route は `/admin/customdefinitions/hub`（2026-07-30 実測。`/hierarchy` は GA4 に拒否されて
// ホームへ戻される）。直接 goto が効かない場合は UI クリック（管理 → カスタム定義）で到達する。
function customDefinitionsUrl(prefix) {
  return `${GA4_BASE}#/${prefix}/admin/customdefinitions/hub`;
}
function dataRetentionUrl(prefix) {
  return `${GA4_BASE}#/${prefix}/admin/dataretention`;
}

/**
 * GA4 の SPA ルートへ確実に遷移する。
 *
 * `page.goto` で **hash だけ**を変えても同一ドキュメント内の移動になり、GA4 のルーターが反応せず
 * URL が元のルートに戻ることがある（2026-07-30 実機: admin/customdefinitions へ goto しても
 * reports/intelligenthome のままだった）。そこで goto 後に到達を検査し、届いていなければ
 * **reload でドキュメントごと起動し直す**（hash が付いた状態でブートさせる）。
 *
 * @returns {Promise<boolean>} expect に到達したか
 */
async function gotoGa4Route(page, url, expect, cfg, { tries = 2 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (i === 0) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
    } else {
      await page.reload({ waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
    }
    await page.waitForTimeout(4000 + i * 2000);
    if (expect.test(page.url())) return true;
  }
  return expect.test(page.url());
}

/**
 * カスタム定義画面へ **UI クリックで**到達する（左ナビ「管理」→「カスタム定義」）。
 * URL 直打ちが GA4 のルーターに拒否される場合の確実な経路（2026-07-30 実機で成立を確認）。
 * ラベルは日英両方を候補にし、可視でなければ何も押さずに false を返す（推測クリックしない）。
 */
async function clickToCustomDefinitions(page, cfg) {
  const admin = page.getByText(/^管理$|^Admin$/).first();
  if (!(await admin.isVisible().catch(() => false))) return false;
  await admin.click().catch(() => {});
  await page.waitForTimeout(5000);
  const cd = page.getByText(/^カスタム定義$|^Custom definitions$/).first();
  if (!(await cd.isVisible().catch(() => false))) return false;
  await cd.click().catch(() => {});
  await page.waitForTimeout(5000);
  return /\/admin\/customdefinitions/.test(page.url());
}

/**
 * 管理画面の左ナビを「セクションを開く → 項目をクリック」で辿る汎用版。
 * セクションが折りたたまれていると項目が可視にならないため、必ず先にセクションを開く。
 * どちらかが可視でなければ何も押さずに false（推測クリックしない）。
 */
async function clickToAdminItem(page, sectionRe, itemRe) {
  const admin = page.getByText(/^管理$|^Admin$/).first();
  if (await admin.isVisible().catch(() => false)) {
    await domClick(admin);
    await page.waitForTimeout(4000);
  }
  const section = page.getByText(sectionRe).first();
  if (await section.isVisible().catch(() => false)) {
    await domClick(section);
    await page.waitForTimeout(3000);
  }
  const item = page.getByText(itemRe).first();
  if (!(await item.isVisible().catch(() => false))) return false;
  await domClick(item);
  await page.waitForTimeout(4500);
  return true;
}

/**
 * DOM レベルの click（`el.click()`）。
 * GA4 の左プライマリナビ（`ga-primary-nav.opened`）が展開状態でクリック対象に重なり、
 * Playwright の通常クリックが「pointer events を intercept される」で無限リトライになるため
 * （2026-07-30 実機）、**ナビの遷移だけ**は hit-test を経由しない DOM click で行う。
 * 破壊的なボタン（保存・削除）には使わない＝そこは可視性と一意性を確認したうえで通常クリックする。
 */
async function domClick(locator) {
  await locator.evaluate((el) => el.click()).catch(() => {});
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

  // 実機の列順（2026-07-30 実測）: ディメンション名 / 説明 / スコープ / ユーザープロパティ・パラメータ / 最終変更日 / オプション
  // 空セルは innerText に現れないため、**スコープ列の次のセル**をパラメータ名とみなすのが最も安定する。
  const SCOPE_RE = /^(イベント|ユーザー|商品|Event|User|Item)$/;
  const parsed = [];
  for (const raw of rows) {
    const cells = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    // 見出し行は除外
    if (/^(ディメンション名|Dimension name|表示名)/.test(cells[0])) continue;
    const scopeIdx = cells.findIndex((c) => SCOPE_RE.test(c));
    // スコープの直後がパラメータ名。取れなければ index>0 の最初の識別子っぽいセルへフォールバック。
    // **値の比較で除外してはいけない**（表示名とパラメータ名が同一の行が実在する＝cta_placement）。
    let paramCell = scopeIdx >= 0 ? cells[scopeIdx + 1] : undefined;
    if (!paramCell || !/^[A-Za-z0-9_]{2,40}$/.test(paramCell)) {
      paramCell = cells.slice(1).find((c, i) => /^[A-Za-z0-9_]{2,40}$/.test(c) && i + 1 !== scopeIdx);
    }
    if (scopeIdx < 0 && !paramCell) continue;
    parsed.push({
      displayName: cells[0],
      parameterName: paramCell ?? null,
      scopeLabel: scopeIdx >= 0 ? cells[scopeIdx] : null,
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

/**
 * データ保持の観測（変更はしない）。
 * **「到達できずに読めなかった」と「読めて期待どおりだった」を区別する**（unverified フラグ）。
 * 区別しないと `months: null` が「ドリフトなし」と同じ緑に見えてしまう（§9 と同じ罠）。
 */
async function readDataRetention(page, cfg, prefix) {
  let reached = await gotoGa4Route(page, dataRetentionUrl(prefix), /\/admin\/dataretention/, cfg, { tries: 2 });
  let via = reached ? "url" : null;
  if (!reached) {
    // 左ナビ: 管理 → データの収集と修正 → データの保持
    reached = await clickToAdminItem(page, /^データの収集と修正$|^Data collection and modification$/, /^データの保持$|^Data retention$/);
    via = reached ? "ui-click" : "failed";
  }
  if (!reached) {
    return { reached: false, via, months: null, resetOnNewActivityDetected: null, unverified: true };
  }
  const body = await page.locator("body").innerText().catch(() => "");
  const m = body.match(/(\d+)\s*か月|(\d+)\s*months?/i);
  const months = m ? parseInt(m[1] ?? m[2], 10) : null;
  return {
    reached: true,
    via,
    months,
    resetOnNewActivityDetected: /新しいアクティビティ|Reset user data on new activity/i.test(body),
    // 到達できても月数が読めなければ未確認（UI 表記変更）
    unverified: months == null,
  };
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

  let prefix = `p${propertyId}`;
  try {
    // 1. まずホーム。GA4 が hash を a<account>p<property> へ正規化するのを待って接頭辞を確定する。
    await page.goto(homeUrl(propertyId), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs });
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

    await assertGa4Property(page, propertyId).catch(async (e) => {
      await dumpFailure(page, cfg, runId, { step: "assert-property", expected: [String(propertyId)], message: e.message });
      result.status = "property-mismatch";
      throw Object.assign(e, { handled: true });
    });

    // 2. 正規化された接頭辞でカスタム定義へ。
    prefix = ga4RoutePrefix(page.url(), propertyId);
    result.routePrefix = prefix;
    console.log(`  route 接頭辞: ${prefix}`);
    let reachedCd = await gotoGa4Route(page, customDefinitionsUrl(prefix), /\/admin\/customdefinitions/, cfg);
    result.navigation = reachedCd ? "url" : null;
    if (!reachedCd) {
      // URL 直打ちが拒否された場合は UI クリックで到達する（実機で成立を確認済みの経路）
      reachedCd = await clickToCustomDefinitions(page, cfg);
      result.navigation = reachedCd ? "ui-click" : "failed";
    }
    result.reachedCustomDefinitions = reachedCd;
    console.log(`  カスタム定義への到達: ${reachedCd ? `OK(${result.navigation})` : "NG"}（${page.url()}）`);

    const inventory = await readCustomDimensions(page);
    result.inventory = inventory;
    if (!reachedCd || !inventory.tableVisible) {
      await dumpFailure(page, cfg, runId, {
        step: "read-custom-dimensions",
        expected: ["カスタム ディメンション 表"],
        message: `カスタム定義の表に到達できません（到達=${reachedCd} / 表可視=${inventory.tableVisible} / 行候補=${inventory.rawRowCount}）。1 件も作成せず停止。`,
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
        await gotoGa4Route(page, customDefinitionsUrl(prefix), /\/admin\/customdefinitions/, cfg);
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
    const observedRetention = await readDataRetention(page, cfg, prefix);
    result.dataRetention.observed = observedRetention;
    const wantMonths = desired.dataRetention?.eventDataRetentionMonths ?? null;
    if (observedRetention.unverified) {
      result.dataRetention.unverified = true;
      console.log(`  [未確認] データ保持: 画面から月数を読めなかった（到達=${observedRetention.reached} via=${observedRetention.via}）`);
    } else if (wantMonths != null && observedRetention.months !== wantMonths) {
      result.dataRetention.drift = `観測 ${observedRetention.months} か月 / 期待 ${wantMonths} か月`;
      console.log(`  [drift] データ保持: ${result.dataRetention.drift}（自動変更しない・管理画面で人が変更）`);
    } else {
      console.log(`  データ保持: ${observedRetention.months} か月（期待どおり）`);
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
