import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';

export const EXPANSION_PATH = '.claude/state/content-expansion.json';
export const CONTENT_DECISIONS = ['covered', 'partial', 'unreviewed', 'blocked', 'excluded'];
export const VISUAL_DECISIONS = ['existing', 'created', 'reused', 'unnecessary', 'needed', 'unreviewed'];
export const DERIVATIVE_DECISIONS = ['prepared', 'existing', 'unnecessary', 'needed', 'unreviewed'];
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
      return { ...unit, artifacts, stale: artifacts.some(a => a.state !== 'current'), sourceWaiting, pending };
    });
    return { ...source, title: registered?.title ?? source.sourceId, units };
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
