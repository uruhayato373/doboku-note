/**
 * cli-args.mjs — CLI の引数（--flag・--name value・--name=value）を宣言から読む共通部品（依存ゼロ）。
 *
 * なぜ要るか: 70 を超えるスクリプトが `for (let i = 0; i < args.length; i++) { if (args[i] === '--x') … args[++i] }` を
 * それぞれ手で書いていた。読み方（`--name=value` を受けるか・値の欠けをどう扱うか）がファイルごとに違い、
 * フラグを 1 つ足すたびに同じループを書き直していた。新しく引数を読むときはここから import する
 * （tests/cli-args-ratchet.test.mjs が各自の parseArgs の数を増やさない）。
 *
 * 読み方は手書きのループと同じ: 宣言したフラグだけを拾い、知らないフラグは無視する。値を取るフラグは
 * 次の引数をそのまま値にする（`--x --y` なら x の値は '--y'）。`--name=value` も受ける。
 * 依存ゼロに保つ: npm ci をしないワークフローが（間接にも）読む（tests/workflow-zero-dependency.test.mjs）。
 */

const camel = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const convert = (type, raw, flag) => {
  if (raw === undefined) return undefined;
  if (type === 'integer') return parseInt(raw, 10);
  if (type === 'number') return Number(raw);
  if (type === 'string') return raw;
  throw new Error(`cli-args: ${flag} の type が不正（${type}）`);
};

/**
 * @typedef {{ type: 'boolean' | 'string' | 'integer' | 'number', default?: unknown, multiple?: boolean, alias?: string, key?: string }} FlagSpec
 *   type: boolean は値を取らない。string は文字列、integer は parseInt(v, 10)、number は Number(v)。
 *   multiple: 繰り返し指定を配列に集める（既定は後勝ち）。alias: 別名（'-n' など先頭の - も含めて書く）。
 *   key: 戻り値のキー（既定はフラグ名の camelCase。`--dry-run` → dryRun）。
 */

/**
 * @param {Record<string, FlagSpec>} spec キーは先頭の -- を除いたフラグ名（'dry-run'）
 * @param {string[]} [argv] 既定は process.argv.slice(2)
 * @returns {Record<string, any> & { _: string[] }} 宣言したフラグの値と、フラグでない引数（_）
 */
export function parseCliArgs(spec, argv = process.argv.slice(2)) {
  const byFlag = new Map();
  const out = { _: [] };
  for (const [name, s] of Object.entries(spec)) {
    const key = s.key ?? camel(name);
    const def = s.default ?? (s.multiple ? [] : s.type === 'boolean' ? false : null);
    out[key] = Array.isArray(def) ? [...def] : def;
    byFlag.set(`--${name}`, { ...s, key, name });
    if (s.alias) byFlag.set(s.alias, { ...s, key, name });
  }
  const seen = new Set();
  const assign = (s, value) => {
    if (s.multiple) {
      if (!seen.has(s.key)) out[s.key] = [];
      out[s.key].push(value);
    } else out[s.key] = value;
    seen.add(s.key);
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const flag = eq > 0 ? arg.slice(0, eq) : arg;
    const s = byFlag.get(flag);
    if (!s) {
      if (!arg.startsWith('-')) out._.push(arg);
      continue;
    }
    if (s.type === 'boolean') {
      assign(s, true);
      continue;
    }
    const raw = eq > 0 ? arg.slice(eq + 1) : argv[++i];
    assign(s, convert(s.type, raw, flag));
  }
  return out;
}
