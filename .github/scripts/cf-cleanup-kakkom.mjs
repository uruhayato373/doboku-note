#!/usr/bin/env node
// 使い捨てスクリプト: kakkom Pages プロジェクトと全 deployments を削除する。
// 実行後はこのスクリプトと対応する workflow ファイルを削除すること。
//
// 環境変数（GitHub Actions の secret から注入される想定）:
//   CLOUDFLARE_API_TOKEN  (Pages:Edit 権限必須)
//   CLOUDFLARE_ACCOUNT_ID

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const PROJECT = 'kakkom';

if (!TOKEN || !ACCOUNT) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required');
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}`;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function listDeployments() {
  const res = await fetch(`${base}/deployments?per_page=25`, { headers });
  if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result || [];
}

async function deleteDeployment(id) {
  const res = await fetch(`${base}/deployments/${id}?force=true`, { method: 'DELETE', headers });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function deleteProject() {
  const res = await fetch(base, { method: 'DELETE', headers });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

let total = 0;
let failed = 0;
const failedIds = new Set();

while (true) {
  const list = await listDeployments();
  if (list.length === 0) {
    console.log('No more deployments.');
    break;
  }
  const toProcess = list.filter(d => !failedIds.has(d.id));
  if (toProcess.length === 0) {
    console.log('Remaining deployments all failed previously. Stopping loop.');
    break;
  }
  console.log(`Batch: ${toProcess.length} deployments (list size: ${list.length})`);
  let batchOk = 0;
  for (const d of toProcess) {
    const r = await deleteDeployment(d.id);
    if (r.ok) {
      total++;
      batchOk++;
      process.stdout.write('.');
    } else {
      failed++;
      failedIds.add(d.id);
      console.log(`\n  FAIL ${d.id}: ${r.status} ${r.body.slice(0, 200)}`);
    }
  }
  console.log('');
  if (batchOk === 0) {
    console.log('No progress in this batch. Stopping loop.');
    break;
  }
}

console.log(`\nDeployments: deleted=${total} failed=${failed}`);
if (failed > 0) {
  console.log('Failed deployment IDs:');
  for (const id of failedIds) console.log(`  ${id}`);
  console.log('');
}

console.log('Attempting to delete kakkom project...');
const proj = await deleteProject();
if (proj.ok) {
  console.log('OK: kakkom project deleted.');
} else {
  console.log(`FAIL: project delete failed: ${proj.status} ${proj.body}`);
  console.log('Hint: まだ残っている production deployment があればダッシュボードから手動削除して再実行。');
  process.exit(1);
}
