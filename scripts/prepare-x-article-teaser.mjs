#!/usr/bin/env node
/**
 * X Article を公開した後、対応する告知短文を publish-x 用に解放する。
 *
 * 告知短文は Article URL が確定するまで manual_only=true の予約枠として保持し、
 * 本スクリプトで URL を記録した時だけ tweets.md に出力する。
 *
 * Usage:
 *   npm run x-article:prepare -- --check
 *   npm run x-article:prepare -- --article 1 --url https://x.com/doboku373/article/123 --dry-run
 *   npm run x-article:prepare -- --article 1 --url https://x.com/doboku373/article/123
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFT_DIR = path.join(ROOT, "content/sns/x/draft/094-career-longform-pilot");
const STATUS_PATH = path.join(DRAFT_DIR, "status.json");
const TEMPLATE_PATH = path.join(DRAFT_DIR, "teasers.template.md");
const OUTPUT_PATH = path.join(DRAFT_DIR, "tweets.md");
const PLAN_PATH = path.join(ROOT, ".claude/config/x-campaigns/2026-09-civil.json");
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");

function valueOf(name) {
  const index = ARGS.indexOf(name);
  return index >= 0 ? ARGS[index + 1] : null;
}

function fail(message) {
  console.error(`[x-article:prepare] NG: ${message}`);
  process.exit(1);
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, file)} を読めない: ${error.message}`);
  }
}

function parseBlocks(markdown) {
  const starts = [...markdown.matchAll(/^## Tweet (\d+):\s*(.+)$/gm)];
  return starts.map((match, index) => {
    const end = starts[index + 1]?.index ?? markdown.length;
    const raw = markdown.slice(match.index, end).trim();
    const body = raw.replace(/^## Tweet \d+:.*\n/, "").trim();
    return { number: Number(match[1]), title: match[2].trim(), raw, body };
  });
}

function isXUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ["x.com", "twitter.com"].includes(url.hostname) && url.pathname !== "/";
  } catch {
    return false;
  }
}

if (!fs.existsSync(STATUS_PATH)) fail("status.json がない");
if (!fs.existsSync(TEMPLATE_PATH)) fail("teasers.template.md がない");
if (!fs.existsSync(PLAN_PATH)) fail("2026-09 月次計画がない");

const status = loadJson(STATUS_PATH);
const plan = loadJson(PLAN_PATH);
const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
const blocks = parseBlocks(template);
const mapping = {
  1: { articleKey: "1", teaserKey: "2", placeholder: "{{ARTICLE_URL_01}}" },
  2: { articleKey: "3", teaserKey: "4", placeholder: "{{ARTICLE_URL_02}}" },
  3: { articleKey: "5", teaserKey: "6", placeholder: "{{ARTICLE_URL_03}}" },
  4: { articleKey: "7", teaserKey: "8", placeholder: "{{ARTICLE_URL_04}}" },
};

for (const [articleNo, item] of Object.entries(mapping)) {
  if (!status.tweets?.[item.articleKey]) fail(`Article ${articleNo} の status がない`);
  if (!status.tweets?.[item.teaserKey]) fail(`Article ${articleNo} の告知 status がない`);
  const block = blocks.find((candidate) => candidate.number === Number(item.teaserKey));
  if (!block) fail(`Tweet ${item.teaserKey} のテンプレートがない`);
  if (!block.body.includes(item.placeholder)) fail(`Tweet ${item.teaserKey} に ${item.placeholder} がない`);
  const teaser = status.tweets[item.teaserKey];
  const date = teaser.scheduled_at.slice(0, 10);
  const time = teaser.scheduled_at.slice(11, 16);
  const planEntry = plan.posts?.find((post) => post.date === date && post.time === time);
  if (!planEntry || planEntry.funnel !== "x-article") fail(`Article ${articleNo} の月次計画枠がない`);
}

if (ARGS.includes("--check")) {
  console.log(`[x-article:prepare] OK: Article 4本・告知4本の対応を確認 (${path.relative(ROOT, DRAFT_DIR)})`);
  process.exit(0);
}

const articleNo = Number(valueOf("--article"));
const articleUrl = valueOf("--url");
if (!Number.isInteger(articleNo) || !mapping[articleNo]) fail("--article は 1〜4 で指定する");
if (!isXUrl(articleUrl)) fail("--url は公開済みの https://x.com/... URL を指定する");

const selected = mapping[articleNo];
const selectedBlock = blocks.find((candidate) => candidate.number === Number(selected.teaserKey));
const resolvedBody = selectedBlock.body.replace(selected.placeholder, articleUrl);
const now = new Date().toISOString();
const selectedTeaser = status.tweets[selected.teaserKey];
const selectedDate = selectedTeaser.scheduled_at.slice(0, 10);
const selectedTime = selectedTeaser.scheduled_at.slice(11, 16);
const selectedPlanEntry = plan.posts.find((post) => post.date === selectedDate && post.time === selectedTime);

Object.assign(status.tweets[selected.articleKey], {
  status: "posted",
  posted_at: status.tweets[selected.articleKey].posted_at || now,
  article_url: articleUrl,
});
Object.assign(status.tweets[selected.teaserKey], {
  text: resolvedBody,
  article_url: articleUrl,
  manual_only: false,
});
delete status.tweets[selected.teaserKey].blocked_reason;
status.updated_at = now;
selectedPlanEntry.target = articleUrl;
delete selectedPlanEntry.awaitingTarget;

const publishable = [];
for (const item of Object.values(mapping)) {
  const tweetStatus = status.tweets[item.teaserKey];
  if (!tweetStatus.article_url) continue;
  const block = blocks.find((candidate) => candidate.number === Number(item.teaserKey));
  publishable.push(block.raw.replace(item.placeholder, tweetStatus.article_url));
}

if (!DRY_RUN) {
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_PATH, `${publishable.join("\n\n")}\n`, "utf8");
  fs.writeFileSync(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}

const scheduledAt = status.tweets[selected.teaserKey].scheduled_at.slice(0, 16);
console.log(`[x-article:prepare] OK${DRY_RUN ? " [DRY RUN]" : ""}: Article ${articleNo} のURLを記録し、Tweet ${selected.teaserKey} を解放`);
if (DRY_RUN) process.exit(0);
console.log(`次: npm run x-schedule-guard`);
console.log(`次: npx tsx .claude/skills/social/publish-x/publish-x.ts 094 --tweet ${selected.teaserKey} ${scheduledAt} --dry-run`);
