/**
 * cloudflare-zone-config.mjs — Cloudflare ゾーン設定のドリフト検知（純関数のみ）
 * ---------------------------------------------------------------------------
 * 背景: ゾーン設定（キャッシュ/圧縮/WAF/Bot Management）は管理画面から誰でも変更できてしまい、
 *   変更が SEO・障害調査の見落とし原因になりがち（設定変更に気づかず別原因を疑い続ける）。
 * 方針: REST API の生レスポンス（id/version/modified_on 等のノイズを含む）を正規化し、
 *   直前スナップショットとの差分だけを機械的に出す。fetch は一切しない。
 * usage: import { normalizeZoneConfig, diffZoneConfig, hasDrift } from './cloudflare-zone-config.mjs'
 * exit code: このファイルは CLI を持たない（呼び出し側スクリプトの exit code に従う）。
 */

const RULE_FIELDS = ['description', 'action', 'expression', 'enabled'];
const BOT_BOOLEAN_KEYS = ['fight_mode', 'enable_js', 'using_latest_model', 'auto_update_model', 'suppress_session_score'];

const normalizeRule = (rule) => {
  const out = {};
  for (const key of RULE_FIELDS) out[key] = rule?.[key] ?? null;
  return out;
};

const sortRules = (rules) => {
  const copy = Array.isArray(rules) ? rules.map(normalizeRule) : [];
  copy.sort((a, b) => {
    const d = String(a.description ?? '').localeCompare(String(b.description ?? ''));
    if (d !== 0) return d;
    return String(a.expression ?? '').localeCompare(String(b.expression ?? ''));
  });
  return copy;
};

/**
 * REST API の生レスポンスから id/version/modified_on/editable/last_updated 等のノイズを落とし、
 * 比較可能な形へ正規化する。
 */
export function normalizeZoneConfig(raw) {
  const settings = {};
  for (const row of raw?.settings ?? []) {
    if (row?.id != null) settings[row.id] = row.value ?? null;
  }

  const rulesets = {};
  for (const [phase, ruleset] of Object.entries(raw?.rulesets ?? {})) {
    rulesets[phase] = ruleset && Array.isArray(ruleset.rules) ? sortRules(ruleset.rules) : null;
  }

  const botRaw = raw?.botManagement ?? {};
  const botManagement = {};
  if (!botRaw.unavailable) {
    for (const key of BOT_BOOLEAN_KEYS) {
      if (typeof botRaw[key] === 'boolean') botManagement[key] = botRaw[key];
    }
  }

  return { settings, rulesets, botManagement, plan: raw?.plan ?? null };
}

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** 2 つの正規化済みゾーン設定の差分を { added, removed, changed } で返す。深い比較は値の JSON 化で行う。 */
export function diffZoneConfig(baseline, current) {
  const added = [];
  const removed = [];
  const changed = [];

  const walk = (basePath, from, to) => {
    const fromIsObj = isPlainObject(from);
    const toIsObj = isPlainObject(to);
    if (fromIsObj && toIsObj) {
      const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
      for (const key of keys) {
        const path = basePath ? `${basePath}.${key}` : key;
        const inFrom = Object.prototype.hasOwnProperty.call(from, key);
        const inTo = Object.prototype.hasOwnProperty.call(to, key);
        if (!inFrom && inTo) { added.push(path); continue; }
        if (inFrom && !inTo) { removed.push(path); continue; }
        walk(path, from[key], to[key]);
      }
      return;
    }
    const fromArr = Array.isArray(from);
    const toArr = Array.isArray(to);
    if (fromArr && toArr) {
      const max = Math.max(from.length, to.length);
      for (let i = 0; i < max; i += 1) {
        const path = `${basePath}[${i}]`;
        if (i >= from.length) { added.push(path); continue; }
        if (i >= to.length) { removed.push(path); continue; }
        walk(path, from[i], to[i]);
      }
      return;
    }
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changed.push({ path: basePath, from: from ?? null, to: to ?? null });
    }
  };

  walk('', baseline ?? {}, current ?? {});
  return { added, removed, changed };
}

/** diffZoneConfig の結果にドリフトがあるか。 */
export function hasDrift(diff) {
  return (diff?.added?.length ?? 0) > 0 || (diff?.removed?.length ?? 0) > 0 || (diff?.changed?.length ?? 0) > 0;
}
