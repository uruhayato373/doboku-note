/**
 * robots.txt の中身を決める（純関数）。generate-sitemap.mjs が out/robots.txt に書く。
 *
 * 方針（docs/operations/robots-ai-crawler-decision.md・2026-10-11 に案B へ変更）:
 * - 検索エンジンは全て許可（User-agent: *）。
 * - AI 検索（回答の根拠として検索・参照する）と、利用者の指示でページを読みに来るエージェントは許可する。
 *   ChatGPT 検索・Perplexity・Claude の検索で、出典として引用・リンクされるようにするため。
 * - AI の学習用データを集めるクローラーと、SEO ツールの巡回は拒否する（無断学習を防ぐ方針は変えない）。
 * - Content-Signal（Cloudflare の提案する利用許諾の表明）で「検索と AI の回答への利用は可・学習は不可」を示す。
 */

/** AI 検索の索引と、利用者の指示で読みに来るエージェント（許可）。 */
export const AI_SEARCH_AGENTS = [
  'OAI-SearchBot', // ChatGPT 検索の索引
  'ChatGPT-User', // ChatGPT で利用者がページを開かせたとき
  'PerplexityBot', // Perplexity の索引
  'Perplexity-User', // Perplexity で利用者がページを開かせたとき
  'Claude-SearchBot', // Claude の検索の索引
  'Claude-User', // Claude で利用者がページを開かせたとき
];

/** AI の学習用クローラー（拒否）。 */
export const AI_TRAINING_AGENTS = [
  'GPTBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'FacebookBot',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'Bytespider',
  'Amazonbot',
  'cohere-ai',
  'omgili',
];

/** SEO ツールの巡回（拒否）。 */
export const SEO_TOOL_AGENTS = ['DataForSeoBot', 'SemrushBot', 'AhrefsBot', 'MJ12bot'];

/** 学習・回答・検索への利用の可否（Cloudflare Content Signals Policy の書式）。 */
export const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=no';

const group = (agent, rule) => `User-agent: ${agent}\n${rule}`;

/**
 * @param {{ sitemaps: string[] }} p sitemaps = 載せる sitemap の絶対 URL（順に Sitemap 行にする）
 * @returns {string} robots.txt の本文（末尾改行あり）
 */
export function buildRobotsTxt({ sitemaps }) {
  return [
    '# 検索エンジンクローラー（Allow）。検索と AI の回答への利用は可・AI の学習は不可',
    `User-agent: *\nContent-Signal: ${CONTENT_SIGNAL}\nAllow: /`,
    '# AI 検索と、利用者の指示で読みに来るエージェント（Allow・出典として引用されるため）',
    ...AI_SEARCH_AGENTS.map((a) => group(a, 'Allow: /')),
    '# AI 学習データ収集クローラーは全面 disallow',
    ...AI_TRAINING_AGENTS.map((a) => group(a, 'Disallow: /')),
    '# SEO ツールの巡回は disallow',
    ...SEO_TOOL_AGENTS.map((a) => group(a, 'Disallow: /')),
    sitemaps.map((s) => `Sitemap: ${s}`).join('\n'),
  ].join('\n\n') + '\n';
}
