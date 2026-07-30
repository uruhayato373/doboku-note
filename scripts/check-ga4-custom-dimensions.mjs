#!/usr/bin/env node
/**
 * check-ga4-custom-dimensions.mjs — GA4 管理画面設定のドリフト ゲート（オフライン）
 * ---------------------------------------------------------------------------
 * なぜ必要か: `.github/workflows/fetch-metrics.yml` の
 *   - Fetch GA4 (CTA clicks by label,  for affiliate program/surface EPC)
 *   - Fetch GA4 (affiliate impressions/clicks by placement, for placement CTR)
 * は `continue-on-error: true` で、実装側も「カスタムディメンション未登録ならスキップして exit 0」
 * にしている。結果として **登録されていない期間は CI が緑のまま該当指標だけ永久に欠測**する
 * （プログラム別 EPC・配置別 CTR）。CLAUDE.md §9 の「検査ゼロを PASS と呼ばない」がここにも要る。
 *
 * このゲートは外部アクセスをしない。**desired state（config）** と
 * **最後に実機観測した inventory（.claude/state/metrics/ga4-admin/inventory-latest.json）** を突合し、
 * blocking なディメンションが不足していれば FAIL する。inventory 自体が無い/古い場合も
 * 「確認できていない」として扱い、緑にしない。
 *
 * 使い方:
 *   npm run check-ga4-dimensions
 *   npm run check-ga4-dimensions -- --json
 *   npm run check-ga4-dimensions -- --max-age-days 60
 * exit 0=OK / 1=ドリフトまたは未確認
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from "node:fs";

const DESIRED_PATH = ".claude/config/ga4-admin-desired-state.json";
const INVENTORY_PATH = ".claude/state/metrics/ga4-admin/inventory-latest.json";

const argv = process.argv.slice(2);
const WANT_JSON = argv.includes("--json");
const ai = argv.indexOf("--max-age-days");
const MAX_AGE_DAYS = ai >= 0 && argv[ai + 1] ? parseInt(argv[ai + 1], 10) || 90 : 90;

const errors = [];
const warnings = [];
let checked = 0;

let desired = null;
try {
  desired = JSON.parse(readFileSync(DESIRED_PATH, "utf-8"));
} catch (e) {
  console.error(`[check-ga4-dimensions] ✗ desired state を読めない: ${DESIRED_PATH}（${e.message}）`);
  process.exit(1);
}

const wanted = (desired.customDimensions ?? []).filter((d) => d.parameterName);
// §9: 設定の期待値が 0 件なら「検査できていない」＝緑にしない。
if (wanted.length === 0) {
  console.error(`[check-ga4-dimensions] ✗ desired state の customDimensions が 0 件（設定の期待値が未定義）。`);
  process.exit(1);
}

const inventory = existsSync(INVENTORY_PATH) ? JSON.parse(readFileSync(INVENTORY_PATH, "utf-8")) : null;

const result = {
  check: "ga4-custom-dimensions",
  desiredCount: wanted.length,
  inventoryAt: inventory?.collectedAt ?? null,
  inventoryStatus: inventory?.status ?? null,
  ageDays: null,
  present: [],
  missing: [],
  blockingMissing: [],
  dataRetentionDrift: inventory?.dataRetention?.drift ?? null,
};

if (!inventory) {
  errors.push(
    `実機観測がまだ無い（${INVENTORY_PATH} 不在）。\`node scripts/ga4-admin-setup.mjs\` で観測してください。` +
      ` 未確認のあいだ by-label / by-placement は CI で黙ってスキップされ続けます。`,
  );
} else {
  const ms = Date.parse(inventory.collectedAt ?? "");
  result.ageDays = Number.isFinite(ms) ? Math.floor((Date.now() - ms) / 86400000) : null;
  if (result.ageDays == null) {
    warnings.push("inventory の collectedAt が読めない（鮮度不明）。");
  } else if (result.ageDays >= MAX_AGE_DAYS) {
    warnings.push(`inventory が ${result.ageDays} 日前（しきい値 ${MAX_AGE_DAYS} 日）。再観測を推奨。`);
  }
  if (inventory.status === "not-signed-in" || inventory.status === "property-mismatch" || inventory.status === "custom-definitions-unreachable") {
    errors.push(`最後の観測が失敗している（status=${inventory.status}）＝設定の実態が未確認。再観測が必要。`);
  }

  // 観測時点で算出済みの差分を優先し、無ければ inventory の一覧から再計算する。
  const observedParams = new Set(
    (inventory.inventory?.dimensions ?? [])
      .filter((d) => d.parameterName)
      .map((d) => String(d.parameterName).toLowerCase()),
  );
  const declaredMissing = new Set((inventory.missingAfter ?? inventory.missing ?? []).map((s) => String(s).toLowerCase()));

  for (const d of wanted) {
    checked += 1;
    const key = d.parameterName.toLowerCase();
    const isMissing = declaredMissing.size > 0 ? declaredMissing.has(key) : !observedParams.has(key);
    if (isMissing) {
      result.missing.push(d.parameterName);
      if (d.blocking) result.blockingMissing.push(d.parameterName);
    } else {
      result.present.push(d.parameterName);
    }
  }

  for (const p of result.blockingMissing) {
    const def = wanted.find((d) => d.parameterName === p);
    errors.push(
      `カスタムディメンション未登録: ${p}（範囲=${def?.scope ?? "EVENT"}）。依存: ${(def?.requiredBy ?? []).join(" / ")}` +
        ` → \`node scripts/ga4-admin-setup.mjs --commit\``,
    );
  }
  for (const p of result.missing.filter((x) => !result.blockingMissing.includes(x))) {
    warnings.push(`カスタムディメンション未登録（optional）: ${p}`);
  }
  if (result.dataRetentionDrift) {
    warnings.push(`データ保持のドリフト: ${result.dataRetentionDrift}（管理画面で人が変更・自動変更はしない）`);
  }
}

if (WANT_JSON) {
  console.log(JSON.stringify({ ...result, checkedDimensions: checked, errors, warnings }, null, 2));
} else {
  for (const w of warnings) console.log(`[check-ga4-dimensions] WARN ${w}`);
  for (const e of errors) console.error(`[check-ga4-dimensions] ERROR ${e}`);
  console.log(
    `[check-ga4-dimensions] desired ${result.desiredCount} 件を検査（実検査 ${checked} 件）: 登録済み ${result.present.length}・不足 ${result.missing.length}` +
      `（観測 ${result.inventoryAt ?? "なし"}${result.ageDays != null ? ` / ${result.ageDays}日前` : ""} status=${result.inventoryStatus ?? "なし"}）`,
  );
}

if (errors.length > 0) {
  if (!WANT_JSON) console.error(`\n[check-ga4-dimensions] ✗ ${errors.length} 件`);
  process.exit(1);
}
// §9: 1 件も突合できていないのに緑を返さない。
if (checked === 0) {
  if (!WANT_JSON) console.error("\n[check-ga4-dimensions] ✗ 実検査 0 件（inventory 未取得）。");
  process.exit(1);
}
if (!WANT_JSON) console.log(`\n[check-ga4-dimensions] ✓ ${checked} 件を突合・blocking な不足なし（WARN ${warnings.length} 件）`);
process.exit(0);
