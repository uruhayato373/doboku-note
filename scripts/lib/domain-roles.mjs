/**
 * domain-roles.mjs — 領域ごとの担当（決める・判断の場・空白）、文書の持ち主、記事の型の持ち主、
 * エージェントの役割（role）と対象（target）を検査・解決する純関数。check-domains と管理画面が使う。
 *
 * なぜ要るか: 「どの領域のものか」は全部決まっていたが、「誰が決めるか・誰が更新するか・どの役が何を見るか」は
 * 散文に散らばり照合できなかった（2026-11-18 の計画 docs/handoffs/2026-11-18-agent-roles-plan.md 第3段階・DN-1241）。
 *
 * 担当の書き方（actors）: operator＝運営者、parent＝親、skill:<名>・agent:<名>・script:<npm script 名>。
 */

export const ACTOR_KINDS = ['skill', 'agent', 'script'];

/** frontmatter の 1 行の値を読む（無ければ null）。 */
export function frontmatterField(text, key) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = m?.[1].split(/\r?\n/).find((l) => l.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : null;
}

/**
 * 担当 1 つを検査する。known = { skills:Set, agents:Set, scripts:Set }。
 * @returns {string|null} 問題の説明（無ければ null）
 */
export function actorProblem(value, known, cfg) {
  const v = String(value ?? '');
  if (Object.prototype.hasOwnProperty.call(cfg.actors ?? {}, v) && v !== '_doc') return null;
  const i = v.indexOf(':');
  const kind = i > 0 ? v.slice(0, i) : '';
  const name = v.slice(i + 1);
  if (!ACTOR_KINDS.includes(kind) || !name) return `「${v}」は担当の書き方に合わない（operator / parent / skill:<名> / agent:<名> / script:<名>）`;
  const set = { skill: known.skills, agent: known.agents, script: known.scripts }[kind];
  return set.has(name) ? null : `「${v}」は実在しない（${kind}）`;
}

/** 担当 1 つの表示名（運営者・親・/スキル・エージェント名・npm run 名）。 */
export function actorLabel(value, cfg) {
  const v = String(value ?? '');
  if (cfg.actors?.[v] && v !== '_doc') return cfg.actors[v];
  if (v.startsWith('skill:')) return `/${v.slice(6)}`;
  if (v.startsWith('agent:')) return v.slice(6);
  if (v.startsWith('script:')) return `npm run ${v.slice(7)}`;
  return v;
}

/** 文書パス → 持ち主（documentStewards の長い一致）。無ければ null。 */
export function documentSteward(cfg, path) {
  const p = String(path).split('\\').join('/');
  let best = null;
  for (const [key, s] of Object.entries(cfg.documentStewards ?? {})) {
    const hit = key.endsWith('/') ? p.startsWith(key) : p === key;
    if (hit && (!best || key.length > best.key.length)) best = { key, ...s };
  }
  return best;
}

/** 持ち主が必須の文書か（docs/strategy・marketing・products）。 */
export const STEWARD_REQUIRED = ['docs/strategy/', 'docs/marketing/', 'docs/products/'];
export const stewardRequired = (path) => STEWARD_REQUIRED.some((p) => String(path).startsWith(p));

/**
 * 担当の設定を検査する。
 * @param {object} cfg config/domains.json
 * @param {{ skills:Set<string>, agents:Set<string>, scripts:Set<string> }} known
 * @param {{ name:string, role:string|null, target:string|null }[]} agents frontmatter から読んだエージェント
 * @param {string[]} docs 文書のパス（リポジトリ相対）
 * @returns {{ errors:string[], counts:object }}
 */
export function validateRoles(cfg, known, agents, docs) {
  const errors = [];
  const check = (where, value) => { const p = actorProblem(value, known, cfg); if (p) errors.push(`${where}: ${p}`); };

  for (const d of cfg.domains) {
    const r = d.roles;
    if (!r) { errors.push(`${d.id}: roles（決める・判断の場・空白）が無い`); continue; }
    check(`${d.id}.roles.decides`, r.decides);
    if (!['operator', 'parent'].includes(r.decides)) errors.push(`${d.id}.roles.decides: 決めるのは operator（運営者）か parent（親）`);
    if (!r.review?.length) errors.push(`${d.id}.roles.review: 判断の場が無い`);
    for (const x of r.review ?? []) check(`${d.id}.roles.review`, x);
    for (const g of r.gaps ?? []) check(`${d.id}.roles.gaps「${g.job}」`, g.by);
  }

  const required = docs.filter(stewardRequired);
  for (const p of required) if (!documentSteward(cfg, p)) errors.push(`${p}: documentStewards で持ち主が決まらない`);
  for (const [key, s] of Object.entries(cfg.documentStewards ?? {})) {
    for (const u of s.updates ?? []) check(`documentStewards["${key}"].updates`, u);
    check(`documentStewards["${key}"].approves`, s.approves);
  }

  let contentTypes = 0;
  for (const [type, s] of Object.entries(cfg.contentStewards ?? {})) {
    if (type === '_doc') continue;
    contentTypes++;
    for (const k of ['create', 'fix']) check(`contentStewards.${type}.${k}`, s[k]);
    for (const k of ['review', 'gates']) {
      if (!s[k]?.length) errors.push(`contentStewards.${type}.${k} が空`);
      for (const x of s[k] ?? []) check(`contentStewards.${type}.${k}`, x);
    }
  }

  const roles = new Set(Object.keys(cfg.agentRoles ?? {}));
  const targets = new Set(Object.keys(cfg.agentTargets ?? {}));
  const pairs = new Map();
  for (const a of agents) {
    if (!a.role) errors.push(`.claude/agents/${a.name}.md: frontmatter に role: が無い（${[...roles].join(' / ')}）`);
    else if (!roles.has(a.role)) errors.push(`.claude/agents/${a.name}.md: role: ${a.role} は agentRoles にない`);
    if (!a.target) errors.push(`.claude/agents/${a.name}.md: frontmatter に target: が無い`);
    else if (!targets.has(a.target)) errors.push(`.claude/agents/${a.name}.md: target: ${a.target} は agentTargets にない`);
    if (a.role && a.target) {
      const k = `${a.role}:${a.target}`;
      pairs.set(k, [...(pairs.get(k) ?? []), a.name]);
    }
  }
  const explained = new Set((cfg.agentOverlaps ?? []).map((o) => `${o.role}:${o.target}`));
  for (const [k, names] of pairs) {
    if (names.length > 1 && !explained.has(k)) errors.push(`役割と対象 ${k} が ${names.length} 体（${names.join('・')}）。違いを agentOverlaps に書くか、1 体にまとめる`);
  }
  for (const k of explained) if ((pairs.get(k) ?? []).length < 2) errors.push(`agentOverlaps の ${k} は重複していない（説明を消す）`);
  const used = new Set(agents.map((a) => a.target));
  for (const t of targets) if (!used.has(t)) errors.push(`agentTargets の ${t} を使うエージェントが居ない（語彙を消す）`);

  return {
    errors,
    counts: { domains: cfg.domains.length, stewardDocs: required.length, contentTypes, agents: agents.length, overlaps: [...pairs.values()].filter((n) => n.length > 1).length },
  };
}
