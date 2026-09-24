#!/usr/bin/env node
/**
 * build-growth-digest.mjs — 成長パック（fetch-growth-pack）と既存の計測成果物から、週次レビューでトリアージする
 * 改善機会のダイジェストを作る（オフライン・決定的）。
 *
 * 入力: .claude/state/metrics/growth/pack-YYYY-Www.json（必須）と過去パック、monetization/coverage-*.json、
 *       bing/bing-*.json、.claude/state/experiments.json、.claude/config/seo-watchwords.json、
 *       growth/triage-log.json（週次レビューの処分・抑止に使う）、public/_redirects + content/site（URL→原稿）
 * 出力: .claude/state/metrics/growth/digest-YYYY-Www.json（CI だけが書く。週次レビューは読むだけ）
 *
 * Usage:
 *   node scripts/build-growth-digest.mjs                  # 最新パックの週で digest を書く
 *   node scripts/build-growth-digest.mjs --week 2026-W38  # 指定週
 *   node scripts/build-growth-digest.mjs --print          # 最新 digest（無ければ生成して）を Markdown で stdout へ（書かない）
 *   node scripts/build-growth-digest.mjs --json           # digest JSON を stdout へ（書かない）
 *   node scripts/build-growth-digest.mjs --check          # 書かずに完走だけ確認（CI の quality gate 用）
 *
 * 週次レビュー（土曜 W）は digest W−1（前の完了した月〜日）を読む。--print の先頭に
 * `<!-- growth-digest:YYYY-Www -->` を出し、check-growth-triage がレビュー本文への反映を検査する。
 *
 * exit: 0 成功 / 2 検査不成立（パックが無い）
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { direction, jst } from './lib/business-direction.mjs';
import {
  detectSeo, detectRevenue, detectMeasurement, detectExperiments, selectSurfaced,
  summarizeKpis, topMovers, reconcileBing, inputCoverage,
} from './lib/growth-opportunities.mjs';

const TAG = '[growth-digest]';
const ROOT = process.cwd();
const GROWTH = '.claude/state/metrics/growth';
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const readJsonAt = (root, p, fallback = null) => {
  try { return JSON.parse(readFileSync(join(root, p), 'utf8')); } catch { return fallback; }
};
const latestAt = (root, dir, re) => {
  if (!existsSync(join(root, dir))) return null;
  const files = readdirSync(join(root, dir)).filter((f) => re.test(f)).sort();
  return files.length ? `${dir}/${files.at(-1)}` : null;
};
const readJson = (p, fallback) => readJsonAt(ROOT, p, fallback);
const latestIn = (dir, re) => latestAt(ROOT, dir, re);

/**
 * 公開パス → 原稿パス（index）と、旧 URL → 正規 URL（legacy）。旧 /docs/<slug> の 301 先を公開パスとし、
 * slug は content/site の相対パスから導く（generate-sitemap と同じ規則）。
 */
export function buildContentIndex(root = ROOT) {
  const redirects = new Map();
  const file = join(root, 'public/_redirects');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const [from, to] = line.trim().split(/\s+/);
      const m = /^\/docs\/([^/*]+)$/.exec(from ?? '');
      if (m && to?.startsWith('/')) redirects.set(m[1], to.replace(/\/+$/, ''));
    }
  }
  const index = new Map();
  const walk = (dir, segs) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, [...segs, e.name]);
      else if (e.isFile() && e.name.endsWith('.mdx')) {
        const base = e.name.replace(/\.mdx$/, '');
        const slug = (base === 'article' ? segs : [...segs, base]).join('-');
        const path = redirects.get(slug);
        if (path) index.set(path, relative(root, full).split(sep).join('/'));
      }
    }
  };
  walk(join(root, 'content/site'), []);
  const legacy = new Map([...redirects].map(([slug, to]) => [`/docs/${slug}`, to]));
  return { index, legacy };
}

export function buildDigest({ week, root = ROOT, today = jst() } = {}) {
  const readJson = (p, fallback) => readJsonAt(root, p, fallback);
  const latestIn = (dir, re) => latestAt(root, dir, re);
  const cfg = readJson('.claude/config/growth-cycle.json');
  const packs = existsSync(join(root, GROWTH)) ? readdirSync(join(root, GROWTH)).filter((f) => /^pack-\d{4}-W\d{2}\.json$/.test(f)).sort() : [];
  const packName = week ? `pack-${week}.json` : packs.at(-1);
  if (!packName || !packs.includes(packName)) return null;
  const packFile = `${GROWTH}/${packName}`;
  const pack = readJson(packFile);
  const history = packs.filter((f) => f < packName).map((f) => readJson(`${GROWTH}/${f}`)).filter(Boolean);
  const coverageFile = latestIn('.claude/state/metrics/monetization', /^coverage-\d.*\.json$/);
  const coverage = coverageFile ? readJson(coverageFile) : null;
  const bingFile = latestIn('.claude/state/metrics/bing', /^bing-\d{4}-\d{2}-\d{2}\.json$/);
  const bing = bingFile ? readJson(bingFile) : null;
  const maxAge = cfg.digest.measurement.maxInputAgeDays;
  const coverageStamp = coverageFile?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  const inputs = [
    { name: 'growth-pack', file: packFile, coverage: 'complete', note: null },
    inputCoverage('monetization-coverage', coverageFile, coverageStamp, today, maxAge),
    inputCoverage('bing-webmaster', bingFile, bing?.fetchedAt ?? null, today, maxAge),
  ];
  const ctx = {
    config: cfg.digest,
    qualifications: direction(root).qualifications.map((q) => q.id),
    ...(({ index, legacy }) => ({ contentIndex: index, legacy }))(buildContentIndex(root)),
    watchwords: readJson('.claude/config/seo-watchwords.json', { watchwords: [] }).watchwords,
    packFile, history, coverage, inputs,
  };
  ctx.bingReconciliation = reconcileBing(pack, bing);
  const experiments = readJson('.claude/state/experiments.json', { experiments: [] }).experiments;
  const items = [
    ...detectMeasurement(pack, ctx),
    ...detectExperiments(experiments, Date.parse(`${today}T00:00:00+09:00`)),
    ...detectSeo(pack, ctx),
    ...detectRevenue(pack, ctx),
  ];
  const log = readJson(`${GROWTH}/triage-log.json`, { entries: [] });
  const sel = selectSurfaced(items, { log, weekStart: pack.period.startDate, today, config: cfg.digest });
  return {
    schemaVersion: 1,
    week: pack.week,
    period: pack.period,
    baseline: pack.baseline,
    generatedAt: new Date().toISOString(),
    pack: packFile,
    inputs,
    kpis: summarizeKpis(pack, cfg.digest.revenue),
    bingReconciliation: ctx.bingReconciliation,
    topMovers: topMovers(pack),
    candidates: items.length,
    suppressed: sel.suppressed,
    notSurfaced: sel.notSurfaced,
    surfaced: sel.surfaced,
  };
}

const fmt = (v) => (v == null ? '欠測' : typeof v === 'number' ? v.toLocaleString('ja-JP') : v);
const delta = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`);
const CATEGORY = { measurement: '計測', experiment: '実験', seo: 'SEO', revenue: '収益導線' };

export function renderMarkdown(d) {
  const L = [];
  L.push(`<!-- growth-digest:${d.week} -->`);
  L.push(`## 計測ダイジェスト ${d.week}（${d.period.startDate}〜${d.period.endDate}・基線 ${d.baseline.startDate}〜${d.baseline.endDate} の週平均と比較）`, '');
  L.push(`入力: ${d.inputs.map((i) => `${i.name}=${i.coverage === 'complete' ? '取得済み' : `**欠測**（${i.note}）`}`).join(' / ')}`, '');
  if (d.kpis.ga4) {
    L.push('| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |', '|---|--:|--:|--:|--:|--:|');
    for (const [g, v] of Object.entries(d.kpis.ga4).sort((a, b) => b[1].sessions - a[1].sessions)) {
      L.push(`| ${g} | ${fmt(v.sessions)} | ${fmt(v.baseWeeklySessions)} | ${delta(v.deltaPct)} | ${v.engagementRatePct ?? '—'}% | ${fmt(v.keyEvents)} |`);
    }
    L.push('');
  } else L.push('GA4 流入: **欠測**', '');
  if (d.kpis.gsc) L.push(`GSC（日本・web）: クリック ${fmt(d.kpis.gsc.clicks)}（基線週平均 ${fmt(d.kpis.gsc.baseWeeklyClicks)}・${delta(d.kpis.gsc.deltaPct)}）/ 表示 ${fmt(d.kpis.gsc.impressions)} / CTR ${d.kpis.gsc.ctrPct ?? '—'}%`, '');
  else L.push('GSC: **欠測**', '');
  const b = d.bingReconciliation;
  L.push(`Bing 照合: GA4 の bing 自然検索セッション ${fmt(b.ga4Sessions)} / Bing Webmaster クリック ${fmt(b.wmtClicks)}${b.ratio != null ? `（${b.ratio} 倍）` : ''}${b.note ? `・${b.note}` : ''}`, '');
  if (d.kpis.cta) {
    L.push('| イベント | 今週 | 基線週平均 | 増減 |', '|---|--:|--:|--:|');
    for (const [e, v] of Object.entries(d.kpis.cta)) L.push(`| ${e} | ${fmt(v.week)} | ${fmt(v.baseWeekly)} | ${delta(v.deltaPct)} |`);
    L.push('');
  }
  if (d.topMovers) {
    const row = (r) => `${r.page}（${r.baseWeekly}→${r.week}）`;
    L.push(`google 流入の上昇: ${d.topMovers.gainers.map(row).join(' / ') || 'なし'}`);
    L.push(`google 流入の下落: ${d.topMovers.losers.map(row).join(' / ') || 'なし'}`, '');
  }
  L.push(`### トリアージ対象 ${d.surfaced.length} 件（候補 ${d.candidates}・抑止 ${d.suppressed}・表示上限で見送り SEO ${d.notSurfaced.seo} / 収益 ${d.notSurfaced.revenue}）`, '');
  if (d.surfaced.length) {
    L.push('| ID | 区分 | 内容 | 期待効果/週 | 推奨 |', '|---|---|---|--:|---|');
    for (const s of d.surfaced) {
      const gain = s.expectedWeeklyGain ? `${s.expectedWeeklyGain.value} ${s.expectedWeeklyGain.unit}` : '—';
      L.push(`| ${s.id} | ${CATEGORY[s.category]} | ${s.title.replace(/\|/g, '｜')} | ${gain} | ${s.suggest.join(' / ')} |`);
    }
  } else L.push('（トリアージ対象なし）');
  L.push('', '全件を `npm run growth-triage -- list` で確認し、`apply --decisions <file> --commit` で backlog / 実験 / watchword / 束ね / 却下 / 保留に振り分ける。');
  return L.join('\n');
}

function main() {
  const week = argValue('--week');
  const dryOut = args.includes('--print') || args.includes('--json') || args.includes('--check');
  if (args.includes('--print') && !week) {
    const latest = latestIn(GROWTH, /^digest-\d{4}-W\d{2}\.json$/);
    const latestPack = latestIn(GROWTH, /^pack-\d{4}-W\d{2}\.json$/);
    // 最新パックと同じ週の digest があればそれを出す（CI が書いたものを正とする）
    if (latest && latestPack && latest.slice(-13) === latestPack.slice(-13)) {
      console.log(renderMarkdown(readJson(latest)));
      return 0;
    }
  }
  const digest = buildDigest({ week });
  if (!digest) {
    console.error(`${TAG} 検査不成立: 成長パック${week ? ` pack-${week}.json` : ''}が無い（fetch-growth-pack が未実行）`);
    return 2;
  }
  if (args.includes('--print')) console.log(renderMarkdown(digest));
  else if (args.includes('--json')) console.log(JSON.stringify(digest, null, 2));
  const bycat = digest.surfaced.reduce((a, s) => ({ ...a, [s.category]: (a[s.category] ?? 0) + 1 }), {});
  console.error(`${TAG} ${digest.week}: 候補 ${digest.candidates} 件を検査 / 表示 ${digest.surfaced.length}（${Object.entries(bycat).map(([k, v]) => `${k} ${v}`).join('・') || 'なし'}）/ 抑止 ${digest.suppressed} / 見送り SEO ${digest.notSurfaced.seo}・収益 ${digest.notSurfaced.revenue}`);
  if (!dryOut) {
    mkdirSync(join(ROOT, GROWTH), { recursive: true });
    const out = `${GROWTH}/digest-${digest.week}.json`;
    writeFileSync(join(ROOT, out), `${JSON.stringify(digest, null, 2)}\n`);
    console.error(`${TAG} → ${out}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
