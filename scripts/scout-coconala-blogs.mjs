#!/usr/bin/env node
/**
 * scout-coconala-blogs.mjs — ココナラブログの競合偵察（read-only）
 * ---------------------------------------------------------------------------
 * 何を採るか:
 *   A. クエリ別の実需  — `/blogs/search?keyword=…` の総ヒット数と上位記事
 *   B. 競合の運用実態  — watchUsers の `/blogs/{userId}` から記事一覧（本数・直近更新）
 *   これで「どの論点が読まれているか」「誰がどの頻度で書いているか」を機械で押さえる。
 *
 * なぜ Playwright か:
 *   検索結果カードはクライアントレンダ（SSR HTML に出ない）。scout-coconala-competitors と
 *   同じシステム Chrome ＋永続プロファイル＋headless で DOM をレンダ後に読む。**ログイン不要**。
 *
 * 規約・安全弁（coconala-operations.md §2.3・§5）:
 *   - 公開ページの read-only のみ。**書き込み一切なし**
 *   - 低頻度厳守（既定 90 日・config の cadenceDays）。ページ間 2 秒の礼節・同時実行なし
 *
 * 「検査ゼロを PASS と呼ばない」:
 *   クエリ数・実取得数を必ず出力し、1件も取れなかったクエリは `ok:false` として残す。
 *   全滅なら exit 2（取得不成立）。0 件ヒットの緑と取得失敗の緑を混ぜない。
 *
 * 使い方:
 *   node scripts/scout-coconala-blogs.mjs            # config 全件→snapshot＋history＋drift
 *   node scripts/scout-coconala-blogs.mjs --headed
 *   node scripts/scout-coconala-blogs.mjs --query 経験記述   # ad-hoc（履歴を汚さない）
 * 出力: .claude/state/coconala/blog-competitors.json（+ history/blog-YYYY-MM-DD.json）
 * exit: 0=取得成功 / 1=一部失敗 / 2=全滅（不成立）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, '.claude/config/coconala-blog.json');
const STATE_DIR = join(ROOT, '.claude/state/coconala');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST_PATH = join(STATE_DIR, 'blog-competitors.json');
const PROFILE = join(ROOT, '.local/playwright-coconala-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const TAG = '[scout-coconala-blogs]';

const argv = process.argv.slice(2);
const HEADED = argv.includes('--headed');
const qi = argv.indexOf('--query');
const AD_HOC = qi >= 0 ? argv[qi + 1] : null;
const TOP_N = 12;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const queries = AD_HOC ? [{ q: AD_HOC, exam: 'adhoc' }] : config.queries ?? [];
const watchUsers = AD_HOC ? [] : config.watchUsers ?? [];

/** 検索結果ページから総ヒット数と上位記事を読む（selector は §9.4 実測） */
async function scrapeSearch(page, q) {
  const url = `https://coconala.com/blogs/search?keyword=${encodeURIComponent(q)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('a.c-blogSearchBlockItemWrapper', { timeout: 20_000 }).catch(() => {});
  await sleep(1200);
  return page.evaluate((topN) => {
    const totalText = (document.body.innerText || '').match(/([\d,]+)\s*件中/);
    const cards = [...document.querySelectorAll('a.c-blogSearchBlockItemWrapper')].slice(0, topN).map((a) => {
      const box = a.closest('.c-blogSearchBlockItemContainer') ?? a;
      const lines = (box.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/blogs\/(\d+)\/(\d+)/);
      return {
        title: lines[0] ?? null,
        url: href.startsWith('http') ? href : `https://coconala.com${href}`,
        userId: m?.[1] ?? null,
        postId: m?.[2] ?? null,
        // 末尾3行あたりに 種別 / カテゴリ / 著者 / 日付 が来る（表示順は可変なので生で残す）
        meta: lines.slice(-4),
      };
    });
    return { totalHits: totalText ? Number(totalText[1].replace(/,/g, '')) : null, top: cards };
  }, TOP_N);
}

/** 競合ユーザーのブログ一覧（/blogs/{userId}） */
async function scrapeUser(page, id) {
  const url = `https://coconala.com/blogs/${id}`;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(1800);
  const status = res?.status() ?? null;
  const posts = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/blogs/"]')]
      .map((a) => ({ href: a.getAttribute('href') || '', text: (a.textContent || '').trim() }))
      .filter((x) => /\/blogs\/\d+\/\d+/.test(x.href))
      .map((x) => ({
        title: x.text.split('\n')[0]?.slice(0, 120) || null,
        url: x.href.startsWith('http') ? x.href : `https://coconala.com${x.href}`,
      }))
      // 同一記事がサムネ/タイトルの2リンクで出るので URL で dedupe
      .filter((v, i, arr) => arr.findIndex((y) => y.url === v.url) === i));
  return { status, postCount: posts.length, posts: posts.slice(0, 30) };
}

const prev = existsSync(LATEST_PATH) ? JSON.parse(readFileSync(LATEST_PATH, 'utf8')) : null;

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: !HEADED,
  channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = context.pages()[0] || (await context.newPage());

const out = {
  fetchedAt: new Date().toISOString(),
  platform: 'coconala-blog',
  caveat: '公開ページの read-only 取得。検索は部分一致のためヒット数はノイズを含む。',
  queries: [],
  users: [],
  drift: [],
};

let okCount = 0;
for (const { q, exam, note } of queries) {
  try {
    const r = await scrapeSearch(page, q);
    const ok = r.totalHits !== null || r.top.length > 0;
    out.queries.push({ q, exam: exam ?? null, note: note ?? null, ok, totalHits: r.totalHits, collected: r.top.length, top: r.top });
    if (ok) okCount++;
    console.log(`${TAG} "${q}" → ${r.totalHits ?? '?'} 件 / 上位 ${r.top.length} 本を取得`);
  } catch (e) {
    out.queries.push({ q, exam: exam ?? null, ok: false, error: e.message.slice(0, 140), totalHits: null, collected: 0, top: [] });
    console.error(`${TAG} "${q}" 取得失敗: ${e.message.slice(0, 100)}`);
  }
  await sleep(2000);
}

for (const u of watchUsers) {
  try {
    const r = await scrapeUser(page, u.id);
    out.users.push({ ...u, ok: r.status === 200, status: r.status, postCount: r.postCount, posts: r.posts });
    console.log(`${TAG} user ${u.id}（${u.label}）→ ${r.postCount} 本`);
  } catch (e) {
    out.users.push({ ...u, ok: false, error: e.message.slice(0, 140), postCount: 0, posts: [] });
    console.error(`${TAG} user ${u.id} 取得失敗: ${e.message.slice(0, 100)}`);
  }
  await sleep(2000);
}

await context.close();

// --- drift（前回比） --------------------------------------------------------
if (prev) {
  for (const cur of out.queries) {
    const old = (prev.queries ?? []).find((x) => x.q === cur.q);
    if (old && Number.isFinite(old.totalHits) && Number.isFinite(cur.totalHits) && old.totalHits !== cur.totalHits) {
      out.drift.push({ type: 'hits', q: cur.q, from: old.totalHits, to: cur.totalHits });
    }
  }
  for (const cur of out.users) {
    const old = (prev.users ?? []).find((x) => x.id === cur.id);
    if (old && old.postCount !== cur.postCount) {
      out.drift.push({ type: 'posts', user: cur.id, label: cur.label, from: old.postCount, to: cur.postCount });
    }
  }
  out.driftBasis = prev.fetchedAt;
} else {
  out.driftBasis = null;
}

const total = out.queries.length + out.users.length;
const okAll = okCount + out.users.filter((u) => u.ok).length;
out.scan = { target: total, ok: okAll, failed: total - okAll };

if (AD_HOC) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(okAll ? 0 : 2);
}

mkdirSync(HISTORY_DIR, { recursive: true });
writeFileSync(LATEST_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
writeFileSync(join(HISTORY_DIR, `blog-${today()}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`${TAG} 取得 ${okAll}/${total} 件${out.drift.length ? ` ・drift ${out.drift.length} 件` : ''} → ${LATEST_PATH.replace(ROOT + '/', '')}`);
if (okAll === 0) { console.error(`${TAG} 全滅（取得不成立）— 0 件ヒットではなく取得できていない`); process.exit(2); }
process.exit(okAll === total ? 0 : 1);
