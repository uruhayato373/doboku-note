import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';

export const EXPANSION_PATH = '.claude/state/content-expansion.json';
export const CONTENT_DECISIONS = ['covered', 'partial', 'unreviewed', 'blocked', 'excluded'];
export const VISUAL_DECISIONS = ['existing', 'created', 'reused', 'unnecessary', 'needed', 'unreviewed'];
export const DERIVATIVE_DECISIONS = ['prepared', 'existing', 'unnecessary', 'needed', 'unreviewed'];
/** 商品（note・Kindle・ココナラ）の原稿とみなす成果物パス。 */
export const PRODUCT_ARTIFACT_RE = /^content\/(note|kindle|coconala)\//;

/**
 * 教材 1 冊の展開状況の集計（管理画面の教材一覧・教材ページが使う唯一の実装）。
 * 本文=内容対応あり（covered）、図解=既存/作成/再利用、SNS=作成/既存、商品=商品原稿の成果物あり。
 */
export function sourceSummary(source) {
  const u = source.units ?? [];
  const count = (f) => u.filter(f).length;
  return {
    units: u.length,
    content: count((x) => x.content === 'covered'),
    visual: count((x) => ['existing', 'created', 'reused'].includes(x.visual?.decision)),
    visualNeeded: count((x) => x.visual?.decision === 'needed'),
    sns: count((x) => ['prepared', 'existing'].includes(x.derivative?.decision)),
    snsNeeded: count((x) => x.derivative?.decision === 'needed'),
    product: count((x) => (x.productArtifacts ?? []).length > 0),
    pending: count((x) => x.pending),
    blocked: count((x) => x.sourceWaiting),
    stale: count((x) => x.stale),
    planned: count((x) => (x.backlogIds ?? []).length > 0),
  };
}

export const DECISION_LABELS = {
  covered: '内容対応あり', partial: '一部対応', unreviewed: '未確認', blocked: '原典待ち', excluded: '対象外',
  existing: '既存あり', created: '新規作成', reused: '既存を再配置', unnecessary: '追加不要', needed: '要制作', prepared: '下書き準備',
};
export const hashFile = file => createHash('sha256').update(readFileSync(file)).digest('hex');

export function artifactPath(root, path) {
  if (typeof path !== 'string' || !path.startsWith('content/') || path.includes('\\') || path.split('/').includes('..')) throw Error('成果物パスが不正');
  const full = resolve(root, path), rel = relative(resolve(root), full);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw Error('成果物がリポジトリ外');
  if (existsSync(full)) {
    const real = relative(realpathSync(root), realpathSync(full));
    if (real === '..' || real.startsWith(`..${sep}`) || isAbsolute(real)) throw Error('成果物のリンク先がリポジトリ外');
  }
  return full;
}

export function loadExpansion(root) {
  return JSON.parse(readFileSync(resolve(root, EXPANSION_PATH), 'utf8'));
}

/** Metadata and evidence checks only. A passing schema never certifies semantic completeness. */
export function expansionReport(root, data = loadExpansion(root), registry = null) {
  registry ??= JSON.parse(readFileSync(resolve(root, '.claude/config/reference-sources.json'), 'utf8'));
  const expected = registry.sources.filter(s => ['commercial-book', 'operator-owned'].includes(s.class));
  const issues = [], stale = [], seen = new Set(), hashes = new Map();
  if (data.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt ?? '')) issues.push('version / reviewedAt を確認してください');
  if (!Array.isArray(data.sources) || !data.sources.length) issues.push('教材を1件も確認していません');
  const sources = (data.sources ?? []).map(source => {
    const registered = expected.find(s => s.id === source.sourceId);
    if (!registered || seen.has(source.sourceId)) issues.push(`教材IDが未知または重複: ${source.sourceId}`);
    seen.add(source.sourceId);
    if (!source.scopeNote?.trim() || !Array.isArray(source.units) || !source.units.length) issues.push(`${source.sourceId}: 確認範囲・論点がありません`);
    const ids = new Set();
    const units = (source.units ?? []).map(unit => {
      if (!unit.id || ids.has(unit.id)) issues.push(`${source.sourceId}: 論点IDが欠落または重複`);
      ids.add(unit.id);
      if (!unit.need?.trim() || !unit.reason?.trim() || !CONTENT_DECISIONS.includes(unit.content)) issues.push(`${unit.id}: 学習課題・理由・判定を確認してください`);
      if (!['body-reviewed', 'prior-review', 'topic-map', 'source-unavailable'].includes(unit.evidenceLevel)) issues.push(`${unit.id}: 確認の深さが不明です`);
      if (unit.content === 'covered' && unit.evidenceLevel === 'source-unavailable') issues.push(`${unit.id}: 原典不足の根拠だけでは内容対応ありにできません`);
      if (!VISUAL_DECISIONS.includes(unit.visual?.decision) || !unit.visual?.reason?.trim()) issues.push(`${unit.id}: 図解の要否と理由が不明です`);
      if (!DERIVATIVE_DECISIONS.includes(unit.derivative?.decision) || !unit.derivative?.reason?.trim()) issues.push(`${unit.id}: SNS展開の要否と理由が不明です`);
      if (!Array.isArray(unit.locators) || !unit.locators.length) issues.push(`${unit.id}: 原本・教材の箇所指定がありません`);
      const artifacts = (unit.artifacts ?? []).map(artifact => {
        let state = 'current';
        try {
          const full = artifactPath(root, artifact.path);
          if (!/^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')) issues.push(`${unit.id}: 成果物の確認時ハッシュが不正`);
          if (!existsSync(full)) state = 'missing';
          else {
            if (!hashes.has(full)) hashes.set(full, hashFile(full));
            if (hashes.get(full) !== artifact.sha256) state = 'changed';
          }
        } catch { issues.push(`${unit.id}: 不正な成果物パス`); state = 'invalid'; }
        if (state !== 'current') stale.push({ unitId: unit.id, path: artifact.path, state });
        return { ...artifact, state };
      });
      if (unit.content === 'covered' && !artifacts.some(a => /\.mdx?$/.test(a.path))) issues.push(`${unit.id}: 内容対応の根拠記事がありません`);
      if (['existing','created','reused'].includes(unit.visual?.decision) && !artifacts.some(a => /\.(svg|webp|png|jpg)$/.test(a.path))) issues.push(`${unit.id}: 図解の実体がありません`);
      if (['prepared','existing'].includes(unit.derivative?.decision) && !artifacts.some(a => a.path.startsWith('content/sns/'))) issues.push(`${unit.id}: SNS原稿の実体がありません`);
      const sourceWaiting = unit.content === 'blocked' || unit.evidenceLevel === 'source-unavailable';
      const pending = !sourceWaiting && (['partial','unreviewed'].includes(unit.content) || unit.evidenceLevel === 'topic-map' || [unit.visual?.decision, unit.derivative?.decision].some(x => ['needed','unreviewed'].includes(x)));
      // 商品への展開は、成果物に note / Kindle / ココナラの原稿が記録されているかで数える（台帳の形は変えない）
      const productArtifacts = artifacts.filter(a => PRODUCT_ARTIFACT_RE.test(a.path));
      return { ...unit, artifacts, productArtifacts, stale: artifacts.some(a => a.state !== 'current'), sourceWaiting, pending };
    });
    if (registered && (!registered.shortTitle?.trim() || !registered.shelf?.trim())) issues.push(`${source.sourceId}: reference-sources.json に shortTitle / shelf がありません`);
    return { ...source, title: registered?.title ?? source.sourceId, shortTitle: registered?.shortTitle ?? source.sourceId, shelf: registered?.shelf ?? 'その他', units };
  });
  const missingSources = expected.filter(s => !seen.has(s.id)).map(s => ({ sourceId: s.id, title: s.title }));
  if (missingSources.length) issues.push(`未棚卸し教材 ${missingSources.length} 件`);
  const units = sources.flatMap(s => s.units.map(u => ({ ...u, sourceId: s.sourceId })));
  const summary = { expectedSources: expected.length, reviewedSources: sources.length, units: units.length,
    pending: units.filter(u => u.pending).length, blocked: units.filter(u => u.sourceWaiting).length,
    excluded: units.filter(u => u.content === 'excluded').length, stale: units.filter(u => u.stale).length,
    topicMapped: units.filter(u => u.evidenceLevel === 'topic-map').length,
  };
  return { reviewedAt: data.reviewedAt, scopeNote: data.scopeNote, sources, units, missingSources, issues, stale, summary,
    productionComplete: issues.length === 0 && summary.pending === 0 && summary.blocked === 0 && summary.stale === 0 && units.length > 0 };
}

/**
 * 論点の「関連商品」（台帳には書かない派生情報）: その論点のサイト記事へリンクしている note / Kindle の原稿。
 * 教材の論点そのものを使った商品という意味ではない（記事から商品への誘導の関係）。
 * 記事の特定は公開 URL → 論理 slug（url-normalization.mjs slugFromKey）で行い、台帳の記事パス
 * content/site/<category>/<dir>/article.mdx（または <category>/<name>.mdx）は `${category}-${dir|name}` に写す。
 * @returns {Map<string, string[]>} 論点 id → 関連商品の原稿パス（repo 相対）
 */
export async function linkedProductsByUnit(root, report) {
  const { slugFromKey } = await import('./url-normalization.mjs');
  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const urlRe = /https?:\/\/(?:www\.)?doboku-note\.com(\/(?:exam|practice|standards|topics|docs)\/[A-Za-z0-9/_-]+)/g;
  const bySlug = new Map();
  const walk = (rel) => {
    let entries;
    try { entries = readdirSync(join(root, rel), { withFileTypes: true }); } catch { return; }
    for (const d of entries) {
      const child = `${rel}/${d.name}`;
      if (d.isDirectory()) { if (!d.name.startsWith('_archive')) walk(child); continue; }
      if (!/\.mdx?$/.test(d.name)) continue;
      const text = readFileSync(join(root, child), 'utf8');
      for (const m of text.matchAll(urlRe)) {
        const slug = slugFromKey(m[1]);
        if (!slug) continue;
        if (!bySlug.has(slug)) bySlug.set(slug, new Set());
        bySlug.get(slug).add(rel.startsWith('content/note') ? child.replace(/\/article(-[^/]+)?\.md$/, '') : child);
      }
    }
  };
  walk('content/note');
  walk('content/kindle');
  const slugOf = (path) => {
    const m = path.match(/^content\/site\/([^/]+)\/(?:([^/]+)\/article\.mdx?|([^/]+)\.mdx?)$/);
    return m ? `${m[1]}-${m[2] ?? m[3]}` : null;
  };
  const out = new Map();
  for (const u of report.units) {
    const found = new Set();
    for (const a of u.artifacts) {
      const slug = slugOf(a.path);
      for (const p of bySlug.get(slug) ?? []) found.add(p);
    }
    out.set(u.id, [...found]);
  }
  return out;
}
