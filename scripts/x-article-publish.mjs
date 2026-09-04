#!/usr/bin/env node
/**
 * X Article の保存済み下書きを指定時刻に1本だけ公開する。
 *
 * X は Article のネイティブ予約を提供していないため、Codex の1回限りローカル
 * 自動化から本スクリプトを呼ぶ。公開を確認できた場合だけ、翌朝の告知短文を
 * prepare-x-article-teaser.mjs で解放する。
 *
 * Usage:
 *   npm run x-article:publish -- --check
 *   npm run x-article:publish -- --article 1 --dry-run
 *   npm run x-article:publish -- --article 1 --publish
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { resolveProfileDir } from "./lib/playwright-auth-profile.mjs";

const ROOT = process.cwd();
const DRAFT_DIR = path.join(ROOT, "content/sns/x/draft/094-career-longform-pilot");
const REGISTRY_PATH = path.join(DRAFT_DIR, "article-drafts.json");
const PROFILE_DIR = resolveProfileDir("x", { cwd: ROOT, repoRoot: ROOT });
const DEBUG_DIR = path.join(ROOT, ".local/playwright-x-debug");
const EXPECTED_ACCOUNT = "doboku373";
const BEFORE_WINDOW_MS = 15 * 60 * 1000;
const AFTER_WINDOW_MS = 120 * 60 * 1000;
const ARGS = process.argv.slice(2);

function valueOf(name) {
  const index = ARGS.indexOf(name);
  return index >= 0 ? ARGS[index + 1] : null;
}

function fail(message) {
  throw new Error(`[x-article:publish] ${message}`);
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) fail("article-drafts.json がない");
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  if (registry.account !== EXPECTED_ACCOUNT) {
    fail(`台帳アカウントが @${EXPECTED_ACCOUNT} ではない: ${registry.account}`);
  }
  return registry;
}

function sourceArticle(item) {
  const sourcePath = path.join(DRAFT_DIR, item.source_file);
  if (!fs.existsSync(sourcePath)) fail(`原稿がない: ${item.source_file}`);
  const markdown = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
  const titleMatch = markdown.match(/^# (.+)$/m);
  if (!titleMatch) fail(`H1 がない: ${item.source_file}`);
  const title = titleMatch[1].trim();
  const body = markdown
    .replace(/^# .+\n+/, "")
    .replace(/^## /gm, "")
    .trim();
  return { title, body };
}

function normalizeText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertRegistry(registry) {
  const keys = Object.keys(registry.articles ?? {});
  if (keys.join(",") !== "1,2,3,4") fail("Article 1〜4 の台帳が揃っていない");
  const draftIds = new Set();
  for (const key of keys) {
    const item = registry.articles[key];
    const source = sourceArticle(item);
    if (source.title !== item.title) fail(`Article ${key}: 原稿H1と台帳titleが不一致`);
    if (!/^\d{19}$/.test(item.draft_id)) fail(`Article ${key}: draft_id が不正`);
    if (draftIds.has(item.draft_id)) fail(`Article ${key}: draft_id が重複`);
    draftIds.add(item.draft_id);
    if (item.edit_url !== `https://x.com/compose/articles/edit/${item.draft_id}`) {
      fail(`Article ${key}: edit_url と draft_id が不一致`);
    }
    if (!Number.isFinite(Date.parse(item.scheduled_at))) fail(`Article ${key}: scheduled_at が不正`);
    if (!Number.isFinite(Date.parse(item.teaser_scheduled_at))) fail(`Article ${key}: teaser_scheduled_at が不正`);
  }
}

function assertTimeWindow(item) {
  if (ARGS.includes("--force")) return;
  const now = Date.now();
  const scheduled = Date.parse(item.scheduled_at);
  if (now < scheduled - BEFORE_WINDOW_MS || now > scheduled + AFTER_WINDOW_MS) {
    fail(
      `公開時刻窓の外。予定=${item.scheduled_at}、許容=15分前〜120分後。手動復旧時だけ --force を使う`,
    );
  }
}

async function saveDebug(page, articleNo, label) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(DEBUG_DIR, `${stamp}_article-${articleNo}_${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

async function assertAccount(page) {
  const profileLink = page.locator(`a[href="/${EXPECTED_ACCOUNT}"]`).first();
  if ((await profileLink.count()) === 0) {
    const debug = await saveDebug(page, "account", "mismatch");
    fail(`@${EXPECTED_ACCOUNT} を確認できない。ログインを確認する: ${debug}`);
  }
}

async function verifyDraft(page, articleNo, item) {
  const source = sourceArticle(item);
  await page.goto(item.edit_url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await assertAccount(page);

  const titleBox = page.locator('textarea[placeholder="タイトルを追加"]').first();
  const bodyBox = page.locator('[contenteditable="true"][role="textbox"]').first();
  if ((await titleBox.count()) === 0 || (await bodyBox.count()) === 0) {
    const debug = await saveDebug(page, articleNo, "editor-missing");
    fail(`Article ${articleNo}: 編集画面を確認できない: ${debug}`);
  }

  const actualTitle = normalizeText(await titleBox.inputValue());
  const actualBody = normalizeText(await bodyBox.innerText());
  if (actualTitle !== source.title || actualTitle !== item.title) {
    fail(`Article ${articleNo}: X下書きのtitleが原稿と不一致`);
  }
  if (actualBody !== normalizeText(source.body)) {
    const debug = await saveDebug(page, articleNo, "body-mismatch");
    fail(
      `Article ${articleNo}: X下書き本文が原稿と不一致 ` +
        `(X=${actualBody.length}字 / 原稿=${normalizeText(source.body).length}字): ${debug}`,
    );
  }
  console.log(`[x-article:publish] Article ${articleNo}: 下書き一致 (${actualBody.length}字)`);
}

async function findPublishedUrl(page, item) {
  await page.goto("https://x.com/compose/articles", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await assertAccount(page);
  const publishedTab = page.getByText("公開中", { exact: true }).first();
  if ((await publishedTab.count()) > 0) {
    await publishedTab.click();
    await page.waitForTimeout(2500);
  }
  const title = page.getByText(item.title, { exact: true }).first();
  if ((await title.count()) === 0) return null;

  const card = title.locator('xpath=ancestor::*[.//button[@aria-label="もっと見る"]][1]');
  const more = card.getByRole("button", { name: "もっと見る", exact: true });
  if ((await more.count()) !== 1) fail(`公開済みArticleの操作メニューを一意に特定できない: ${item.title}`);
  await more.click();
  const showArticle = page.getByRole("menuitem", { name: "記事を表示", exact: true });
  if ((await showArticle.count()) !== 1) fail(`公開済みArticleの表示メニューを一意に特定できない: ${item.title}`);
  await Promise.all([
    page.waitForURL(/\/article\/\d+/, { timeout: 15000 }),
    showArticle.click(),
  ]);
  const articleUrl = page.url().split("?")[0];
  if (!/^https:\/\/x\.com\/doboku373\/article\/\d+$/.test(articleUrl)) {
    fail(`公開URLの形式が不正: ${articleUrl}`);
  }
  if ((await page.getByText(item.title, { exact: true }).count()) === 0) {
    fail(`公開URLでタイトルを確認できない: ${articleUrl}`);
  }
  return articleUrl;
}

function finalizeLocalState(registry, articleNo, articleUrl) {
  const item = registry.articles[String(articleNo)];
  const publishedAt = item.published_at || new Date().toISOString();
  const result = spawnSync(
    process.execPath,
    ["scripts/prepare-x-article-teaser.mjs", "--article", String(articleNo), "--url", articleUrl],
    { cwd: ROOT, stdio: "inherit" },
  );
  if (result.status !== 0) fail(`Article ${articleNo}: 告知短文の解放に失敗`);

  Object.assign(item, {
    status: "published",
    article_url: articleUrl,
    published_at: publishedAt,
    teaser_prepared_at: new Date().toISOString(),
  });
  registry.updated_at = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  console.log(`[x-article:publish] Article ${articleNo}: 公開確認 ${articleUrl}`);
  console.log(
    `[x-article:publish] 次: Tweet ${item.teaser_tweet} を ${item.teaser_scheduled_at.slice(0, 16)} に予約`,
  );
}

async function main() {
  const registry = loadRegistry();
  assertRegistry(registry);

  if (ARGS.includes("--check")) {
    console.log("[x-article:publish] OK: Article 4本の台帳・原稿・時刻を確認");
    return;
  }

  const articleNo = Number(valueOf("--article"));
  if (!Number.isInteger(articleNo) || !registry.articles[String(articleNo)]) {
    fail("--article は 1〜4 で指定する");
  }
  const dryRun = ARGS.includes("--dry-run");
  const publish = ARGS.includes("--publish");
  if (dryRun === publish) fail("--dry-run または --publish のどちらか一方を指定する");
  const item = registry.articles[String(articleNo)];
  if (publish) assertTimeWindow(item);

  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await assertAccountAfterHome(page);
    const existingUrl = publish ? await findPublishedUrl(page, item) : null;
    if (publish && existingUrl) {
      console.log(`[x-article:publish] Article ${articleNo}: 既に公開済み。ローカル状態を再同期`);
      finalizeLocalState(registry, articleNo, existingUrl);
      return;
    }

    await verifyDraft(page, articleNo, item);
    const editorPublish = page.locator("button:visible").filter({ hasText: /^公開$/ }).first();
    if ((await editorPublish.count()) === 0) fail(`Article ${articleNo}: 編集画面の公開ボタンがない`);
    await editorPublish.click();

    const confirmationTitle = page.getByText("記事を公開", { exact: true }).first();
    await confirmationTitle.waitFor({ state: "visible", timeout: 10000 });
    const audienceLabel = page.getByText("公開範囲を選択", { exact: true }).first();
    if ((await audienceLabel.count()) === 0 || !(await audienceLabel.isVisible())) {
      fail(`Article ${articleNo}: 公開確認画面ではない`);
    }
    const finalPublish = page.locator('button[aria-label="公開"]:visible');
    if ((await finalPublish.count()) !== 1) fail(`Article ${articleNo}: 最終公開ボタンを一意に特定できない`);

    if (dryRun) {
      const close = page.locator('button[aria-label="閉じる"]:visible').first();
      if ((await close.count()) === 0) fail(`Article ${articleNo}: 確認モーダルを安全に閉じられない`);
      await close.click();
      console.log(`[x-article:publish] OK [DRY RUN]: Article ${articleNo} は最終公開直前まで確認`);
      return;
    }

    await finalPublish.click();
    await confirmationTitle.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);
    const articleUrl = await findPublishedUrl(page, item);
    if (!articleUrl) {
      const debug = await saveDebug(page, articleNo, "publish-unverified");
      fail(`Article ${articleNo}: 公開後URLを確認できない。再実行前に確認する: ${debug}`);
    }
    finalizeLocalState(registry, articleNo, articleUrl);
  } finally {
    await context.close();
  }
}

async function assertAccountAfterHome(page) {
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await assertAccount(page);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
