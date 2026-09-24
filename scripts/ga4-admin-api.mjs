#!/usr/bin/env node
/**
 * ga4-admin-api.mjs — GA4 Admin API（v1beta）で管理設定を観測し、不足キーイベントを作成する。
 *
 * なぜ: 管理設定の観測は Playwright（scripts/ga4-admin-setup.mjs）で本人ログインが要り、最後の観測は
 * 2026-09-04 で止まっていた。キーイベントは 1 件も未設定で、ページ別のコンバージョン率を GA4 標準指標で
 * 取れなかった。API ならサービスアカウントで CI から毎週観測でき、作成も同じ認証で行える。
 *
 *   check  … カスタムディメンション・キーイベント・データ保持を読み、desired state と突合して表示する。
 *            --commit で .claude/state/metrics/ga4-admin/inventory-latest.json を上書き（check-ga4-dimensions が読む）。
 *            必要権限: プロパティの閲覧者（Data API と同じサービスアカウント）
 *   apply  … desired state の keyEvents のうち不足分を作成する（作成のみ。編集・削除はしない）。
 *            既定は dry-run、--commit で作成。必要権限: プロパティの**編集者**
 *
 * desired state: .claude/config/ga4-admin-desired-state.json（customDimensions / keyEvents / dataRetention）
 *
 * Usage:
 *   node scripts/ga4-admin-api.mjs check [--commit]
 *   node scripts/ga4-admin-api.mjs apply [--commit]
 *
 * exit: 0 成功 / 1 作成失敗あり / 2 検査不成立（認証なし・権限不足・Admin API 未有効化）
 * 失敗時は inventory を書き換えない（前回の観測を失敗で潰さない）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { google } from 'googleapis';
import dotenv from 'dotenv';

const TAG = '[ga4-admin-api]';
const DESIRED = '.claude/config/ga4-admin-desired-state.json';
const INVENTORY = '.claude/state/metrics/ga4-admin/inventory-latest.json';
const RETENTION_MONTHS = { TWO_MONTHS: 2, FOURTEEN_MONTHS: 14, TWENTY_SIX_MONTHS: 26, THIRTY_EIGHT_MONTHS: 38, FIFTY_MONTHS: 50 };

/** 観測と desired state の差分（純関数）。 */
export function planAdmin(desired, observed) {
  const dimParams = new Set(observed.customDimensions.map((d) => String(d.parameterName).toLowerCase()));
  const wantDims = (desired.customDimensions ?? []).filter((d) => d.parameterName);
  const keyNames = new Set(observed.keyEvents.map((k) => k.eventName));
  const wantKeys = (desired.keyEvents ?? []).filter((k) => k.eventName);
  const months = RETENTION_MONTHS[observed.retention?.eventDataRetention] ?? null;
  const wantRet = desired.dataRetention ?? {};
  const drift = [];
  if (wantRet.eventDataRetentionMonths && months !== wantRet.eventDataRetentionMonths) drift.push(`イベントデータ保持 ${months ?? '不明'} か月（期待 ${wantRet.eventDataRetentionMonths} か月）`);
  if (typeof wantRet.resetOnNewActivity === 'boolean' && observed.retention && observed.retention.resetUserDataOnNewActivity !== wantRet.resetOnNewActivity) {
    drift.push(`新しいアクティビティでリセット=${observed.retention.resetUserDataOnNewActivity}（期待 ${wantRet.resetOnNewActivity}）`);
  }
  return {
    dimensions: {
      present: wantDims.filter((d) => dimParams.has(d.parameterName.toLowerCase())).map((d) => d.parameterName),
      missing: wantDims.filter((d) => !dimParams.has(d.parameterName.toLowerCase())).map((d) => d.parameterName),
    },
    keyEvents: {
      present: wantKeys.filter((k) => keyNames.has(k.eventName)).map((k) => k.eventName),
      missing: wantKeys.filter((k) => !keyNames.has(k.eventName)).map((k) => k.eventName),
    },
    retention: { months, drift: drift.length ? drift.join(' / ') : null },
  };
}

/** API エラーを「権限不足」「API 未有効化」「その他」に分ける。 */
export function classifyAdminError(e) {
  const msg = String(e?.message ?? e);
  const code = e?.code ?? e?.response?.status;
  if (/SERVICE_DISABLED|has not been used|is disabled/i.test(msg)) return { kind: 'api-disabled', hint: 'GCP コンソールでサービスアカウントのプロジェクトに「Google Analytics Admin API」を有効化する' };
  if (code === 403 || /PERMISSION_DENIED|insufficient permission/i.test(msg)) return { kind: 'permission-denied', hint: 'GA4 のプロパティ アクセス管理でサービスアカウントに権限を付与する（check=閲覧者 / apply=編集者）' };
  return { kind: 'error', hint: msg.slice(0, 200) };
}

function client(scope) {
  dotenv.config({ path: '.env.local', quiet: true });
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH が未設定'), { unavailable: true });
  const credentials = JSON.parse(readFileSync(keyPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [`https://www.googleapis.com/auth/${scope}`] });
  return google.analyticsadmin({ version: 'v1beta', auth });
}

async function listAll(fn, params, key) {
  const out = [];
  let pageToken;
  do {
    const { data } = await fn({ ...params, pageSize: 200, pageToken });
    out.push(...(data[key] ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

async function observe(admin, property) {
  const [customDimensions, keyEvents, retention] = await Promise.all([
    listAll((p) => admin.properties.customDimensions.list(p), { parent: property }, 'customDimensions'),
    listAll((p) => admin.properties.keyEvents.list(p), { parent: property }, 'keyEvents'),
    admin.properties.getDataRetentionSettings({ name: `${property}/dataRetentionSettings` }).then((r) => r.data),
  ]);
  return { customDimensions, keyEvents, retention };
}

async function main() {
  const [command] = process.argv.slice(2);
  const commit = process.argv.includes('--commit');
  if (!['check', 'apply'].includes(command)) {
    console.error(`${TAG} usage: check|apply [--commit]`);
    return 2;
  }
  const desired = JSON.parse(readFileSync(DESIRED, 'utf8'));
  const property = `properties/${desired.propertyId}`;
  if (process.env.GA4_PROPERTY_ID && process.env.GA4_PROPERTY_ID !== desired.propertyId) {
    console.error(`${TAG} 検査不成立: GA4_PROPERTY_ID(${process.env.GA4_PROPERTY_ID}) と desired state(${desired.propertyId}) が不一致`);
    return 2;
  }

  let admin;
  let observed;
  try {
    admin = client(command === 'apply' ? 'analytics.edit' : 'analytics.readonly');
    observed = await observe(admin, property);
  } catch (e) {
    const c = e.unavailable ? { kind: 'credentials-unavailable', hint: e.message } : classifyAdminError(e);
    console.error(`${TAG} 検査不成立（${c.kind}）: ${c.hint}`);
    return 2;
  }

  const plan = planAdmin(desired, observed);
  console.log(`${TAG} ${property}: カスタムディメンション 実機 ${observed.customDimensions.length} 件（期待 ${plan.dimensions.present.length + plan.dimensions.missing.length} 件中 不足 ${plan.dimensions.missing.length}）`
    + ` / キーイベント 実機 ${observed.keyEvents.length} 件（期待 ${plan.keyEvents.present.length + plan.keyEvents.missing.length} 件中 不足 ${plan.keyEvents.missing.length}）`
    + ` / データ保持 ${plan.retention.months ?? '不明'} か月${plan.retention.drift ? `（ドリフト: ${plan.retention.drift}）` : ''}`);
  for (const m of plan.dimensions.missing) console.log(`  不足ディメンション: ${m}（作成は scripts/ga4-admin-setup.mjs --commit）`);
  for (const m of plan.keyEvents.missing) console.log(`  不足キーイベント: ${m}`);

  const created = [];
  const createFailures = [];
  if (command === 'apply') {
    if (!commit) {
      console.log(`${TAG} dry-run: ${plan.keyEvents.missing.length} 件を作成予定（--commit で実行）`);
      return 0;
    }
    for (const eventName of plan.keyEvents.missing) {
      try {
        await admin.properties.keyEvents.create({ parent: property, requestBody: { eventName, countingMethod: 'ONCE_PER_EVENT' } });
        created.push(eventName);
        console.log(`  ✓ 作成: ${eventName}`);
      } catch (e) {
        const c = classifyAdminError(e);
        createFailures.push({ eventName, kind: c.kind });
        console.error(`  ✗ 作成失敗: ${eventName}（${c.kind}: ${c.hint}）`);
      }
    }
    if (created.length) observed = await observe(admin, property);
  }

  if (commit) {
    const after = planAdmin(desired, observed);
    const now = new Date();
    const inventory = {
      schemaVersion: 1,
      runId: now.toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z',
      collectedAt: now.toISOString(),
      propertyId: desired.propertyId,
      mode: command === 'apply' ? 'api-apply' : 'api-check',
      source: 'admin-api',
      status: 'ok',
      desiredCount: (desired.customDimensions ?? []).length,
      inventory: {
        dimensions: observed.customDimensions.map((d) => ({ displayName: d.displayName, parameterName: d.parameterName, scopeLabel: d.scope })),
      },
      missing: after.dimensions.missing,
      present: after.dimensions.present,
      created: [],
      createFailures: [],
      keyEvents: {
        observed: observed.keyEvents.map((k) => ({ eventName: k.eventName, countingMethod: k.countingMethod, createTime: k.createTime })),
        present: after.keyEvents.present,
        missing: after.keyEvents.missing,
        created,
        createFailures,
      },
      dataRetention: {
        desired: desired.dataRetention,
        observed: { reached: true, via: 'admin-api', months: after.retention.months, resetOnNewActivity: observed.retention?.resetUserDataOnNewActivity ?? null, unverified: false },
        drift: after.retention.drift,
      },
      note: 'GA4 Admin API（v1beta）による観測。キーイベントは不足分の作成のみ（apply --commit）。カスタムディメンションの作成は ga4-admin-setup.mjs。',
    };
    mkdirSync(dirname(INVENTORY), { recursive: true });
    writeFileSync(INVENTORY, `${JSON.stringify(inventory, null, 2)}\n`);
    console.log(`${TAG} → ${INVENTORY}`);
  }
  return createFailures.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(
    (code) => { process.exitCode = code; },
    (e) => { console.error(`${TAG} 失敗: ${e?.message ?? e}`); process.exitCode = 1; },
  );
}
