/**
 * robots.txt（scripts/lib/robots-txt.mjs）のテスト。方針（docs/operations/robots-ai-crawler-decision.md）を固定する:
 * 検索エンジンと AI 検索は許可、AI の学習用クローラーと SEO ツールは拒否。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { AI_SEARCH_AGENTS, AI_TRAINING_AGENTS, SEO_TOOL_AGENTS, buildRobotsTxt } from '../scripts/lib/robots-txt.mjs';

/** robots.txt を「User-agent → その群の規則」に分ける（空行で群が切れる素朴な読み方で足りる） */
function parse(txt) {
  const rules = new Map();
  for (const block of txt.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l) => l && !l.startsWith('#'));
    const agents = lines.filter((l) => l.startsWith('User-agent:')).map((l) => l.slice(11).trim());
    const body = lines.filter((l) => !l.startsWith('User-agent:'));
    for (const a of agents) rules.set(a, body);
  }
  return rules;
}

const txt = buildRobotsTxt({ sitemaps: ['https://doboku-note.com/sitemap.xml', 'https://doboku-note.com/sitemap-legacy.xml'] });
const rules = parse(txt);

test('検索エンジン（*）は許可し、学習は不可の Content-Signal を付ける', () => {
  assert.deepEqual(rules.get('*'), ['Content-Signal: search=yes, ai-input=yes, ai-train=no', 'Allow: /']);
});

test('AI 検索と利用者の指示で読みに来るエージェントは許可する（ChatGPT 検索・Perplexity・Claude）', () => {
  for (const a of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User']) {
    assert.deepEqual(rules.get(a), ['Allow: /'], a);
  }
});

test('AI の学習用クローラーと SEO ツールは拒否する', () => {
  for (const a of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Meta-ExternalAgent', 'Bytespider', 'SemrushBot', 'AhrefsBot']) {
    assert.deepEqual(rules.get(a), ['Disallow: /'], a);
  }
});

test('許可と拒否の一覧が重ならない', () => {
  const allow = new Set(AI_SEARCH_AGENTS);
  for (const a of [...AI_TRAINING_AGENTS, ...SEO_TOOL_AGENTS]) assert.ok(!allow.has(a), a);
});

test('渡した sitemap を順に Sitemap 行にする', () => {
  assert.match(txt, /Sitemap: https:\/\/doboku-note\.com\/sitemap\.xml\nSitemap: https:\/\/doboku-note\.com\/sitemap-legacy\.xml\n$/);
});
