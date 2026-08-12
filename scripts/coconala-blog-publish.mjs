#!/usr/bin/env node
/**
 * coconala-blog-publish.mjs — ココナラブログ記事の下書き作成／公開（決定的 Playwright）
 * ---------------------------------------------------------------------------
 * 流儀は coconala-publish.mjs と同じ: **fail-fast ガード → account assert → 既定は下書き →
 * `--commit` で公開 → 実測で検証 → SoT へ書き戻し**。
 *
 * 何を守るか（ハードゲート・真実源 coconala-blog-policy.md §7）:
 *   ブラウザを起動する**前に** coconala-blog-guards の5種を全部通す。外部リンクが1本でも
 *   混ざると規約違反でアカウント制限になりうるので、通信する前に落とす。
 *
 * 偽成功検証（G6）:
 *   「投稿する」を押したログを成功と呼ばない。公開後に**ログアウト状態の新しいコンテキスト**で
 *   ライブ URL を取得し、タイトル・冒頭段落が描画され、外部リンクが0であることを DOM で実査する。
 *
 * 実機仕様の要点（operations.md §9.4 が真実源。ここに書くのは「なぜそう書いたか」だけ）:
 *   - `getByText('下書き保存'/'公開設定').click()` は Vue の再描画で 30s タイムアウトする。
 *     `page.evaluate(() => el.click())` で押す。**タイムアウトしても保存はされている**ことがある
 *     ので、押せなかった＝何も起きていない、と決めつけず必ず一覧で実測する
 *   - 本文は innerHTML 注入をしない（リッチエディタの内部状態が壊れる）。段落ごとに
 *     `keyboard.insertText` ＋ Enter で、エディタ自身に `div.c-blogBody_text` を作らせる
 *   - 自出品 URL を1行で置くとサービスカード（`div.c-blogBody_service[data-id]`）に自動変換される
 *
 * 使い方:
 *   node scripts/coconala-blog-publish.mjs --post <slug>              # 下書き保存（既定）
 *   node scripts/coconala-blog-publish.mjs --post <slug> --commit     # 公開
 *   node scripts/coconala-blog-publish.mjs --post <slug> --headless
 * exit: 0=成功/冪等スキップ / 1=ガード違反 / 2=login・account・ライブ検証の失敗 / 3=UI 到達失敗
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { launchContext, waitForLogin, assertAccount, readCatalog, shotPath, sleep, ROOT } from './lib/coconala-session.mjs';
import { assertBlogPost, BlogGuardError } from './lib/coconala-blog-guards.mjs';

const TAG = '[blog-publish]';
const argv = process.argv.slice(2);
const getArg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const SLUG = getArg('--post');
const COMMIT = argv.includes('--commit');
const HEADLESS = argv.includes('--headless');

if (!SLUG) { console.error(`${TAG} --post <slug> が必要です`); process.exit(1); }
const DIR = join(ROOT, 'docs/coconala-blog', SLUG);
const ARTICLE = join(DIR, 'article.md');
if (!existsSync(ARTICLE)) { console.error(`${TAG} 記事がありません: ${ARTICLE}`); process.exit(1); }

const raw = readFileSync(ARTICLE, 'utf8');
const fmText = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const fm = (k) => (fmText.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) ?? '';
const fmList = (k) => {
  const v = fm(k);
  return v ? v.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
};
const bodyMd = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();

const title = fm('title');
const status = fm('status');
const funnel = fmList('funnel');
const category = fm('category') || '学び';
const tags = fmList('tags');
const coverRel = fm('cover');

// --- 冪等ガード（二重公開しない） ------------------------------------------
if (status === 'published' && fm('blogUrl')) {
  console.log(`${TAG} 既に公開済み（${fm('blogUrl')}）— 何もしません`);
  process.exit(0);
}

// --- ハードゲート（通信前に落とす） ----------------------------------------
const catalog = readCatalog();
let gate;
try {
  gate = assertBlogPost({ title, body: bodyMd, funnel }, catalog);
} catch (e) {
  if (e instanceof BlogGuardError) { console.error(`${TAG} ガード違反 [${e.code}]\n${e.message}`); process.exit(1); }
  throw e;
}
console.log(`${TAG} ガード通過: リンク ${gate.links.urlsFound} 件（許可 ${gate.links.allowed}）・金額 ${gate.price.amountsFound} 件・` +
  `導線 ${gate.funnel.targets.map((t) => t.id).join(',')}・タイトル ${gate.title.length}字` +
  `${gate.title.lengthChecked ? '' : '（長さ上限は未計測＝未検査）'}`);

// カバー画像は「あれば使う」。パスが書いてあるのに実体が無いのは事故なので先に落とす。
let coverAbs = '';
if (coverRel) {
  coverAbs = join(DIR, coverRel);
  if (!existsSync(coverAbs)) { console.error(`${TAG} cover が実在しません: ${coverAbs}`); process.exit(1); }
  statSync(coverAbs);
}

/** 本文 Markdown を、エディタへ流し込む「ブロック列」に変換する。
 *  - `## 見出し` → { kind:'heading' }（選択ツールバーで見出し化する）
 *  - `service:<id>` 単独行 → { kind:'service' }（自出品 URL に展開してカード化させる）
 *  - それ以外の非空行 → { kind:'text' }
 *  リスト記法や装飾はエディタ側に無いので、書き手が素の文で書く前提（policy §4）。 */
function toBlocks(md, catalogRef) {
  const blocks = [];
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^#{2,3}\s+(.+)$/);
    if (h) { blocks.push({ kind: 'heading', text: h[1].trim() }); continue; }
    const s = t.match(/^service:([a-z0-9-]+)$/i);
    if (s) {
      const svc = catalogRef[s[1]];
      if (!svc?.serviceUrl) throw new BlogGuardError('SERVICE_URL_MISSING', `service:${s[1]} の serviceUrl がカタログにありません`);
      blocks.push({ kind: 'service', url: svc.serviceUrl, id: s[1] });
      continue;
    }
    blocks.push({ kind: 'text', text: t });
  }
  return blocks;
}
let blocks;
try { blocks = toBlocks(bodyMd, catalog); }
catch (e) { console.error(`${TAG} ${e.message}`); process.exit(1); }
const sourceTextLen = blocks.filter((b) => b.kind !== 'service').reduce((n, b) => n + b.text.length, 0);
console.log(`${TAG} ブロック ${blocks.length}（見出し ${blocks.filter((b) => b.kind === 'heading').length} / ` +
  `本文 ${blocks.filter((b) => b.kind === 'text').length} / カード ${blocks.filter((b) => b.kind === 'service').length}）`);

mkdirSync(join(ROOT, '.tmp/coconala'), { recursive: true });
const shot = (n) => shotPath(n);
const clickBy = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);

const ctx = await launchContext({ headless: HEADLESS });
const page = ctx.pages()[0] || (await ctx.newPage());
let exitCode = 0;
let liveUrl = '';
let blogId = '';

try {
  const login = await waitForLogin(page, { tag: TAG });
  if (!login.ok) { console.error(`${TAG} ${login.reason}`); process.exit(2); }
  const acct = await assertAccount(page, { tag: TAG });
  if (!acct.ok) { console.error(`${TAG} account assert 失敗: ${acct.reason}`); process.exit(2); }

  // [1] エディタを開く
  await page.goto('https://coconala.com/mypage/blogs/add?kind=1', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  if (!(await page.$('input[placeholder="ブログタイトル"]'))) {
    await page.screenshot({ path: shot(`blog-nav-fail-${SLUG}.png`) }).catch(() => {});
    console.error(`${TAG} エディタに到達できません（URL=${page.url()}）`); process.exit(3);
  }

  // [2] カバー画像
  if (coverAbs) {
    await page.setInputFiles('input[type=file]', coverAbs).catch((e) => console.log(`${TAG} カバー添付 skip: ${e.message.slice(0, 60)}`));
    await sleep(2500);
  }

  // [3] タイトル
  await page.fill('input[placeholder="ブログタイトル"]', title);
  await sleep(500);

  // [4] 本文（段落ごとに insertText。innerHTML 注入はしない）
  const CE = '[contenteditable="true"]';
  await page.click(CE);
  await sleep(400);
  for (const b of blocks) {
    if (b.kind === 'service') {
      await page.keyboard.insertText(b.url);
      await page.keyboard.press('Enter');
      await sleep(2500);      // カード化の変換を待つ
      continue;
    }
    await page.keyboard.insertText(b.text);
    if (b.kind === 'heading') {
      // 直前に入れた行を選択 → 装飾ツールバーの「見出し」
      await page.keyboard.down('Shift');
      await page.keyboard.press('Home');
      await page.keyboard.up('Shift');
      await sleep(700);
      const ok = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.c-blogEditor_decorationBtn, .c-blogEditor_decorationBtn-first')]
          .find((e) => /見出し/.test(e.textContent || ''));
        if (!btn) return false; btn.click(); return true;
      });
      if (!ok) console.log(`${TAG} 見出し化できず（素の段落のまま）: ${b.text.slice(0, 20)}`);
      await page.keyboard.press('End');
      await sleep(400);
    }
    await page.keyboard.press('Enter');
    await sleep(250);
  }
  await sleep(1500);

  // [5] 反映の実測（入力できたつもりで空、を防ぐ）
  const filled = await page.evaluate((sel) => {
    const ce = document.querySelector(sel);
    return {
      text: (ce?.innerText || '').replace(/\s/g, '').length,
      cards: document.querySelectorAll('.c-blogBody_service').length,
      headings: document.querySelectorAll('.c-blogBody_heading, .c-blogBody_text h2, .c-blogBody_text h3').length,
    };
  }, CE);
  const wantLen = blocks.filter((b) => b.kind !== 'service').reduce((n, b) => n + b.text.replace(/\s/g, '').length, 0);
  const ratio = wantLen ? filled.text / wantLen : 1;
  console.log(`${TAG} 反映実測: 本文 ${filled.text}/${wantLen} 字（${(ratio * 100).toFixed(0)}%）・カード ${filled.cards} 枚`);
  const wantCards = blocks.filter((b) => b.kind === 'service').length;
  if (ratio < 0.9) {
    await page.screenshot({ path: shot(`blog-short-${SLUG}.png`) }).catch(() => {});
    console.error(`${TAG} 本文の反映が不足（${(ratio * 100).toFixed(0)}%）— 途中で切れています。中断します`); process.exit(3);
  }
  if (filled.cards < wantCards) {
    await page.screenshot({ path: shot(`blog-nocard-${SLUG}.png`) }).catch(() => {});
    console.error(`${TAG} サービスカードが ${filled.cards}/${wantCards} 枚しか生成されていません。中断します`); process.exit(3);
  }

  // [6] 下書き保存（テキスト一致では掴めないので DOM から拾って click）
  const savedDraft = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /下書き保存/.test(x.textContent || ''));
    if (!b) return false; b.click(); return true;
  });
  console.log(`${TAG} 下書き保存クリック: ${savedDraft}`);
  await sleep(6000);
  blogId = (page.url().match(/\/mypage\/blogs\/edit\/(\d+)/) || [])[1] || '';

  // [7] 一覧で実在を確認（クリックの成否ではなく**実体**で判定する）
  await page.goto('https://coconala.com/mypage/blogs', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(3500);
  const listed = await page.evaluate((t) =>
    [...document.querySelectorAll('.c-blogContent')].some((r) => (r.innerText || '').includes(t)), title);
  console.log(`${TAG} 一覧に実在: ${listed}${blogId ? ` (blogId=${blogId})` : ''}`);
  if (!listed) {
    await page.screenshot({ path: shot(`blog-draft-missing-${SLUG}.png`) }).catch(() => {});
    console.error(`${TAG} 下書きが一覧にありません。中断します`); process.exit(3);
  }

  if (!COMMIT) {
    console.log(`${TAG} 下書きまで完了（公開するには --commit）`);
  } else {
    // [8] 公開設定 → カテゴリ・ハッシュタグ → 投稿する
    if (!blogId) {
      blogId = await page.evaluate((t) => {
        const row = [...document.querySelectorAll('.c-blogContent')].find((r) => (r.innerText || '').includes(t));
        row?.querySelector('.c-blogContent_edit')?.click();
        return '';
      }, title);
      await sleep(5000);
      blogId = (page.url().match(/\/mypage\/blogs\/edit\/(\d+)/) || [])[1] || '';
    } else {
      await page.goto(`https://coconala.com/mypage/blogs/edit/${blogId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await sleep(4500);
    }
    if (!(await clickBy(page, 'button.c-blogPost_triggerPublish'))) {
      console.error(`${TAG} 公開設定ボタンが見つかりません`); process.exit(3);
    }
    await sleep(4000);

    const catOk = await page.evaluate((c) => {
      const sel = document.querySelector('select');
      if (!sel) return false;
      const opt = [...sel.options].find((o) => o.textContent.trim() === c);
      if (!opt) return false;
      sel.value = opt.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, category);
    console.log(`${TAG} カテゴリ "${category}": ${catOk}`);
    if (!catOk) { console.error(`${TAG} カテゴリを選べません（公開設定に必須）`); process.exit(3); }

    for (const t of tags.slice(0, 4)) {
      const input = await page.$('.c-modal input.input, [class*="Publishing"] input.input');
      if (!input) break;
      await input.fill(t);
      await page.keyboard.press('Enter');
      await sleep(800);
    }

    const posted = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /^投稿する$/.test((x.textContent || '').trim()));
      if (!b) return false; b.click(); return true;
    });
    console.log(`${TAG} 投稿するクリック: ${posted}`);
    await sleep(8000);
    await page.screenshot({ path: shot(`blog-published-${SLUG}.png`) }).catch(() => {});

    // [9] 公開状態を**一覧の実体**で確認
    await page.goto('https://coconala.com/mypage/blogs', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(3500);
    const pub = await page.evaluate((t) => {
      const row = [...document.querySelectorAll('.c-blogContent')].find((r) => (r.innerText || '').includes(t));
      if (!row) return null;
      return { draft: !!row.querySelector('.c-blogContent_statusDraft'), text: (row.innerText || '').slice(0, 120) };
    }, title);
    console.log(`${TAG} 一覧の状態: ${JSON.stringify(pub)}`);
    if (!pub || pub.draft) {
      console.error(`${TAG} 一覧でまだ下書きです＝公開できていません。「公開した」とは報告しません`); process.exit(2);
    }

    // ライブ URL を取得（プロフィールのブログ一覧から自分の記事を引く）
    const uid = (await page.evaluate(() =>
      document.querySelector('a[href^="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/)?.[1] ?? '')) || '';
    if (uid) {
      await page.goto(`https://coconala.com/blogs/${uid}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await sleep(3000);
      liveUrl = await page.evaluate((t) => {
        const a = [...document.querySelectorAll('a[href*="/blogs/"]')]
          .find((x) => /\/blogs\/\d+\/\d+/.test(x.getAttribute('href') || '') && (x.textContent || '').includes(t.slice(0, 12)));
        const h = a?.getAttribute('href') || '';
        return h ? (h.startsWith('http') ? h : `https://coconala.com${h}`) : '';
      }, title);
    }
    console.log(`${TAG} ライブ URL: ${liveUrl || '(取得できず)'}`);

    // [10] 偽成功検証（G6）— ログアウト状態の新規コンテキストで実査
    if (liveUrl) {
      const anon = await chromium.launch({ headless: true, channel: 'chrome' });
      try {
        const ap = await anon.newPage();
        await ap.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await sleep(2500);
        const v = await ap.evaluate(() => ({
          title: document.title,
          text: (document.body.innerText || '').replace(/\s/g, '').length,
          external: [...document.querySelectorAll('article a[href], [class*="blogBody"] a[href]')]
            .map((a) => a.getAttribute('href') || '')
            .filter((h) => /^https?:\/\//.test(h) && !/^https:\/\/coconala\.com/.test(h)),
        }));
        const titleOk = v.title.includes(title.slice(0, 10));
        console.log(`${TAG} ライブ実査: title一致=${titleOk} 本文${v.text}字 外部リンク${v.external.length}件`);
        if (!titleOk || v.text < 200) { console.error(`${TAG} ライブでの描画を確認できません`); exitCode = 2; }
        if (v.external.length) { console.error(`${TAG} ★ライブに外部リンクがあります: ${v.external.join(', ')}`); exitCode = 2; }
      } finally { await anon.close(); }
    } else {
      console.error(`${TAG} ライブ URL を取れないため G6 検証が不成立（公開自体は一覧で確認済み）`);
      exitCode = 2;
    }

    // [11] frontmatter 書き戻し
    if (exitCode === 0) {
      writeBackFm({ blogUrl: liveUrl, blogId, status: 'published', publishedAt: new Date().toISOString().slice(0, 10) });
      console.log(`${TAG} frontmatter 書き戻し完了`);
    } else {
      console.log(`${TAG} 検証が通っていないので frontmatter は書き戻しません（status は draft のまま）`);
    }
  }
} finally {
  await ctx.close();
}
console.log('RESULT:', JSON.stringify({ slug: SLUG, mode: COMMIT ? 'commit' : 'draft', blogId, liveUrl, exitCode }));
process.exit(exitCode);

/** frontmatter を「あれば置換・無ければ挿入」で書き戻す（置換のみだと無言で失敗する） */
function writeBackFm(fields) {
  let text = readFileSync(ARTICLE, 'utf8');
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  for (const [k, v] of Object.entries(fields)) {
    const re = new RegExp(`^${k}:.*$`, 'm');
    const line = `${k}: "${v}"`;
    if (re.test(text.split(/^---$/m)[1] ?? '')) text = text.replace(re, line);
    else text = text.replace(/^(---\r?\n)/, `$1${line}${eol}`);
  }
  writeFileSync(ARTICLE, text, 'utf8');
}
