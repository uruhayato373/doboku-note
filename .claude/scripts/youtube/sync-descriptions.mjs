#!/usr/bin/env node
// sync-descriptions.mjs — 投稿済み動画の概要欄を台帳の description へ揃える
// ---------------------------------------------------------------------------
// なぜ要るか（2026-08-13 実発生）:
//   SNS 共通設定 sns-common/sns-config.mjs の noteUrl が旧ハンドル（HTTP 404）のままで、
//   そこから生成された概要欄が **note への送客リンクが死んだ状態**で公開されていた。
//   SSOT を直しても、既に公開済みの動画の概要欄は自動では変わらない。
//   台帳（.claude/state/youtube-schedule.json）の description を正として live へ流す。
//
// 設計:
//   - **台帳が正**。ライブが台帳と違えば台帳へ揃える（逆はしない）
//   - 既定は dry-run。実更新は --commit（収益アカウントなので段階ゲート）
//   - videoId を持つ item だけが対象（未投稿は触らない）
//   - 更新は videos.update の snippet 部分のみ。タイトル・タグ・カテゴリも台帳へ揃える
//     （snippet は部分更新できず、送ったもので置き換わるため全項目を渡す必要がある）
//   - 認証は post-from-schedule.cjs / verify-yt-status.mjs と同じパターン。
//     **ローカルに creds は置かない**（CI/CD 供給が正）。無ければ exit 1
//
// 使い方:
//   node .claude/scripts/youtube/sync-descriptions.mjs             # dry-run（差分表示のみ）
//   node .claude/scripts/youtube/sync-descriptions.mjs --commit    # 実更新
//   node .claude/scripts/youtube/sync-descriptions.mjs --dry       # creds 無しで台帳の差分候補だけ見る
//
// exit: 0 = 差分なし or 更新成功 / 2 = 差分あり（dry-run） / 1 = 認証・API 失敗 / 3 = 検査不成立
// ---------------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LEDGER = join(ROOT, '.claude/state/youtube-schedule.json');
const COMMIT = process.argv.includes('--commit');
const DRY_NO_API = process.argv.includes('--dry');

if (!existsSync(LEDGER)) {
  console.error('[sync-descriptions] NG: 台帳が無い:', LEDGER);
  process.exit(3);
}
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const items = (ledger.items ?? []).filter((x) => x && x.videoId);

console.log(`[sync-descriptions] 台帳 ${(ledger.items ?? []).length} 件 / videoId あり ${items.length} 件を対象`);
if (items.length === 0) {
  // 検査ゼロを PASS と呼ばない。videoId を持つ item が 1 件も無いなら、
  // 「差分なし」ではなく「そもそも投稿されていない or 台帳が壊れている」。
  console.error('[sync-descriptions] NG: videoId を持つ item が 0 件（検査不成立）');
  process.exit(3);
}

if (DRY_NO_API) {
  console.log('\n--dry: API を叩かず台帳の内容だけ表示する');
  for (const it of items) {
    const dead = /note\.com\/uruhayato/.test(it.description ?? '');
    console.log(`  ${it.videoId}  ${dead ? '★旧ハンドル残存' : 'ok'}  ${(it.title ?? '').slice(0, 44)}`);
  }
  process.exit(0);
}

const env = process.env;
for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
  if (!env[k]) {
    console.error(`[sync-descriptions] NG: ${k} が無い。ローカルに creds は置かない方針なので CI で実行すること`);
    console.error('  → gh workflow run "🔁 Sync YouTube descriptions"');
    process.exit(1);
  }
}

const { google } = await import('googleapis');
const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2 });

// ライブの snippet を取得（50 件ずつ）
const byId = new Map();
for (let i = 0; i < items.length; i += 50) {
  const ids = items.slice(i, i + 50).map((x) => x.videoId);
  const res = await youtube.videos.list({ part: ['snippet', 'status'], id: ids });
  for (const v of res.data.items ?? []) byId.set(v.id, v);
}
console.log(`[sync-descriptions] ライブ取得 ${byId.size}/${items.length} 件`);
if (byId.size === 0) {
  console.error('[sync-descriptions] NG: ライブから 1 件も取れなかった（検査不成立）');
  process.exit(1);
}

const diffs = [];
for (const it of items) {
  const live = byId.get(it.videoId);
  if (!live) { console.log(`  ? ${it.videoId}: ライブに存在しない（削除/非公開の疑い・触らない）`); continue; }
  const want = String(it.description ?? '');
  const now = String(live.snippet?.description ?? '');
  if (want && want !== now) diffs.push({ it, live });
}

console.log(`\n差分 ${diffs.length} 件`);
for (const d of diffs) {
  const deadNow = /note\.com\/uruhayato/.test(d.live.snippet?.description ?? '');
  console.log(`  ${d.it.videoId}  ${deadNow ? '★ライブに旧ハンドル' : ''}  ${(d.it.title ?? '').slice(0, 40)}`);
}
if (diffs.length === 0) { console.log('[sync-descriptions] ✓ 概要欄はすべて台帳と一致'); process.exit(0); }

if (!COMMIT) {
  console.log('\n--commit を付けると台帳の内容でライブを更新する（既定は dry-run）');
  process.exit(2);
}

let ok = 0, ng = 0;
for (const d of diffs) {
  try {
    // snippet は部分更新できない。送らなかった項目は消えるため全部渡す。
    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: d.it.videoId,
        snippet: {
          title: d.it.title ?? d.live.snippet.title,
          description: d.it.description,
          tags: d.it.tags ?? d.live.snippet.tags,
          categoryId: String(d.it.categoryId ?? d.live.snippet.categoryId ?? '27'),
        },
      },
    });
    ok++;
    console.log(`  ✓ ${d.it.videoId} 更新`);
  } catch (e) {
    ng++;
    console.error(`  ✗ ${d.it.videoId} 失敗: ${String(e.message).slice(0, 120)}`);
  }
}
console.log(`\n[sync-descriptions] 成功 ${ok} / 失敗 ${ng} / 差分 ${diffs.length}`);
process.exit(ng ? 1 : 0);
