/**
 * スキル・エージェントの一覧を frontmatter から作る（純関数）。build-capability-index と check-doc-coupling が使う。
 *
 * なぜ要るか: 一覧（skills-guide.md・agents-registry.md）と変更記録（skills-registry.md）は SKILL.md と agents の
 * frontmatter の手書きの写しで、追加・削除・description 変更のたびに同一 commit での更新を求められ、14 日で計 50 回変更していた
 * （2026-11-11）。原本から生成し、手では直さない。変更の経緯は git の履歴が持つ。
 */
import matter from 'gray-matter';
import { escapeRegExp } from './regexp-escape.mjs';

/** スキルのカテゴリの表示名と並び順。frontmatter の category がここに無ければ、id のまま末尾に出す */
export const CATEGORY_LABELS = [
  ['authoring', 'コンテンツ制作'],
  ['conversion', '変換'],
  ['quality', '品質管理'],
  ['social', 'SNS 運用'],
  ['dev', '開発'],
  ['analytics', '分析'],
  ['metrics', '計測'],
  ['management', '戦略・管理'],
  ['ui', 'UI/UX'],
  ['ads', 'アフィリエイト運用'],
];

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
// 表のセル: バックスラッシュを先に逃がしてから | を逃がす（逆順だと、足した \ をもう一度逃がしてしまう）
const cell = (s) => oneLine(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

/** SKILL.md・agents の 1 ファイルを読む。frontmatter が無い・name が無いときは null */
export function parseEntry(content) {
  let parsed;
  try { parsed = matter(String(content).replace(/^﻿/, '')); } catch { return null; }
  const d = parsed.data ?? {};
  if (!d.name) return null;
  return {
    name: String(d.name),
    category: d.category == null ? '' : String(d.category),
    domain: d.domain == null ? '' : String(d.domain),
    description: oneLine(d.description),
    model: d.model == null ? '' : String(d.model),
    role: d.role == null ? '' : String(d.role),
    target: d.target == null ? '' : String(d.target),
    tools: d.tools == null ? null : oneLine(Array.isArray(d.tools) ? d.tools.join(', ') : d.tools),
    body: parsed.content ?? '',
  };
}

/** tools の allowlist に変更系のツールが無ければ監査のみ。tools を書いていなければ全ツール＝編集可 */
export function agentKind(tools) {
  if (tools == null) return '編集可';
  return /\b(Edit|Write|NotebookEdit)\b/.test(tools) ? '編集可' : '監査のみ';
}

/** スキルの本文に名前が出るエージェント（スキル名 → エージェント名の配列）。名前は前後が英数・ハイフンでないものだけ数える */
export function skillAgentMap(skills, agentNames) {
  const map = new Map();
  for (const skill of skills) {
    const hits = agentNames.filter((name) => new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(name)}(?![A-Za-z0-9-])`).test(skill.body));
    if (hits.length) map.set(skill.name, hits.sort());
  }
  return map;
}

export function renderSkills(skills) {
  const known = new Map(CATEGORY_LABELS);
  const cats = [...CATEGORY_LABELS.map(([id]) => id), ...[...new Set(skills.map((s) => s.category))].filter((c) => !known.has(c)).sort()];
  const out = [`スキル ${skills.length} 本（\`.claude/skills/*/SKILL.md\` の frontmatter から生成）。`, ''];
  for (const cat of cats) {
    const rows = skills.filter((s) => s.category === cat).sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) continue;
    out.push(`### ${known.has(cat) ? `${known.get(cat)}（${cat}）` : cat || 'category なし'}`, '', '| スキル | 領域 | 説明 |', '|---|---|---|');
    for (const s of rows) out.push(`| \`/${s.name}\` | ${cell(s.domain)} | ${cell(s.description)} |`);
    out.push('');
  }
  return out.join('\n').trimEnd();
}

export function renderAgents(agents, callers, labels = {}) {
  const role = (r) => labels.roles?.[r] ?? r;
  const out = [`エージェント ${agents.length} 体（\`.claude/agents/*.md\` の frontmatter から生成。「呼び出すスキル」はスキルの本文に名前が出るもの）。`, '', '| エージェント | 役割 | 対象 | 種別 | model | 領域 | 説明 | 呼び出すスキル |', '|---|---|---|---|---|---|---|---|'];
  for (const a of [...agents].sort((x, y) => x.name.localeCompare(y.name))) {
    const by = callers.get(a.name) ?? [];
    out.push(`| \`${a.name}\` | ${cell(role(a.role)) || '—'} | ${cell(a.target) || '—'} | ${agentKind(a.tools)} | ${cell(a.model)} | ${cell(a.domain)} | ${cell(a.description)} | ${by.map((s) => `\`/${s}\``).join(' ') || '—'} |`);
  }
  return out.join('\n');
}

/** 「行（領域か対象）×役割」の表。セルはエージェント名。labels.roles の並びを列にする */
function roleMatrix(agents, rowKey, rows, rowLabel, roleIds, roleName) {
  const head = `| ${rowLabel} | ${roleIds.map(roleName).join(' | ')} |`;
  const out = [head, `|---|${roleIds.map(() => '---').join('|')}|`];
  for (const [id, label] of rows) {
    const mine = agents.filter((a) => a[rowKey] === id);
    if (!mine.length) continue;
    const cells = roleIds.map((r) => mine.filter((a) => a.role === r).map((a) => `\`${a.name}\``).sort().join(' ') || '—');
    out.push(`| ${cell(label)} | ${cells.join(' | ')} |`);
  }
  return out;
}

/** 領域×役割・対象×役割の表（agents-registry.md の生成区間 agent-roles）。語彙と並びは config/domains.json */
export function renderAgentRoles(agents, labels = {}) {
  const roleIds = Object.keys(labels.roles ?? {}).length ? Object.keys(labels.roles) : [...new Set(agents.map((a) => a.role))].sort();
  const roleName = (r) => labels.roles?.[r] ?? r;
  const domains = labels.domains?.length ? labels.domains : [...new Set(agents.map((a) => a.domain))].sort().map((d) => [d, d]);
  const targets = Object.entries(labels.targets ?? {}).length
    ? Object.entries(labels.targets).map(([id, l]) => [id, `${l}（${id}）`])
    : [...new Set(agents.map((a) => a.target))].sort().map((x) => [x, x]);
  return [
    '役割と対象は各エージェントの frontmatter の `role:`・`target:`（語彙と重複の説明は領域の正本の agentRoles・agentTargets・agentOverlaps。`npm run check-domains` が止める）。',
    '',
    '**領域×役割**',
    '',
    ...roleMatrix(agents, 'domain', domains, '領域', roleIds, roleName),
    '',
    '**対象×役割**',
    '',
    ...roleMatrix(agents, 'target', targets, '対象', roleIds, roleName),
  ].join('\n');
}

export function renderCallMap(map) {
  const out = ['スキルの本文に名前が出るエージェント（呼び出しのほか、担当外の案内も含む）。', '', '| スキル | エージェント |', '|---|---|'];
  for (const skill of [...map.keys()].sort()) out.push(`| \`/${skill}\` | ${map.get(skill).map((a) => `\`${a}\``).join(' ')} |`);
  return out.join('\n');
}

const startMark = (id) => `<!-- generated:${id}:start（npm run build-capability-index が書く。手で直さない） -->`;
const endMark = (id) => `<!-- generated:${id}:end -->`;

/** 文書の中の生成区間（マーカーの間）を body に置き換える。マーカーが無ければ null。改行コードは文書に合わせる */
export function replaceRegion(doc, id, body) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const s = doc.indexOf(startMark(id));
  const e = doc.indexOf(endMark(id));
  if (s === -1 || e === -1 || e < s) return null;
  return doc.slice(0, s) + startMark(id) + eol + body.split('\n').join(eol) + eol + doc.slice(e);
}

export const markers = { start: startMark, end: endMark };

/**
 * 生成物を作る。入力は読み込んだファイルの中身と、役割・対象・領域の表示名（labels: { roles, targets, domains:[[id,label]] }。無ければ id のまま）。
 * @returns {{ skills: object[], agents: object[], invalid: string[], regions: Record<string, string> }}
 */
export function buildIndex({ skillFiles, agentFiles, labels = {} }) {
  const invalid = [];
  const read = (files) => files.map(({ path, content }) => { const e = parseEntry(content); if (!e) invalid.push(path); return e; }).filter(Boolean);
  const skills = read(skillFiles);
  const agents = read(agentFiles);
  const map = skillAgentMap(skills, agents.map((a) => a.name));
  const callers = new Map();
  for (const [skill, names] of map) for (const name of names) callers.set(name, [...(callers.get(name) ?? []), skill].sort());
  return { skills, agents, invalid, regions: { skills: renderSkills(skills), agents: renderAgents(agents, callers, labels), 'agent-roles': renderAgentRoles(agents, labels), 'skill-agent-map': renderCallMap(map) } };
}
