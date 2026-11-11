/**
 * cmd-help の判定（純関数・依存ゼロ）。package.json の scripts と、各スクリプトの冒頭コメントからコマンドの用途を引く。
 *
 * なぜ要るか: コマンドの用途と罠は `.claude/knowledge/reference/commands.md`（144KB）に手で写していた。スクリプトを足す・直すたびに
 * 文書も直す必要があり、14 日で 62 回変更していた（2026-11-11）。写しを持たず、原本（package.json と冒頭コメント）から引く。
 * check-command-guidance が「script の起動するファイルに冒頭コメントがある」を検査するので、同じ関数をここに置く。
 */

/** npm script のコマンド文字列から、最初に起動するスクリプトのパスを返す（node / tsx / npx tsx）。無ければ null。 */
export function scriptFile(command) {
  const m = /(?:^|&&\s*|\|\|\s*|;\s*|\s)(?:node|tsx|npx tsx)\s+(?:--[\w=-]+\s+)*([.\w/-]+\.(?:mjs|cjs|js|ts|mts))/.exec(String(command ?? ''));
  return m ? m[1] : null;
}

/**
 * ソースの冒頭コメントを返す。shebang と空行を飛ばし、最初の `/* … *\/` か、連続する `//` の行を読む。
 * @returns {{ kind: 'block' | 'line' | 'none', lines: string[], start: number, end: number }}
 *   lines は記号を外した本文。start / end は元の行番号（0 始まり・両端を含む）。none のとき start は差し込む位置、end は start - 1。
 */
export function headerComment(src) {
  const all = String(src).split(/\r?\n/);
  let i = 0;
  if (all[0]?.startsWith('#!')) i = 1;
  while (all[i] !== undefined && all[i].trim() === '') i++;
  const start = i;
  if (/^\s*\/\*/.test(all[i] ?? '')) {
    const lines = [];
    for (; i < all.length; i++) {
      const closed = /\*\//.test(all[i]);
      const text = all[i].replace(/^\s*\/\*+\s?/, '').replace(/\s*\*+\/\s*$/, '').replace(/^\s*\*\s?/, '');
      lines.push(text.trimEnd());
      if (closed) break;
    }
    return { kind: 'block', lines: trimBlank(lines), start, end: Math.min(i, all.length - 1) };
  }
  const lines = [];
  for (; i < all.length && /^\s*\/\//.test(all[i]); i++) lines.push(all[i].replace(/^\s*\/\/\s?/, '').trimEnd());
  if (!lines.length) return { kind: 'none', lines: [], start, end: start - 1 };
  return { kind: 'line', lines: trimBlank(lines), start, end: i - 1 };
}

function trimBlank(lines) {
  const out = [...lines];
  while (out.length && out[0].trim() === '') out.shift();
  while (out.length && out.at(-1).trim() === '') out.pop();
  return out;
}

/**
 * 語（空白区切り・すべて含む・大文字小文字を区別しない）で scripts を検索する。名前に当たったものを先に並べる。
 * @param {{ scripts: Record<string, string>, readFile: (path: string) => string | null, query: string }} input
 * @returns {Array<{ name: string, command: string, file: string | null, header: string[] }>}
 */
export function searchCommands({ scripts, readFile, query }) {
  const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits = [];
  for (const [name, command] of Object.entries(scripts ?? {})) {
    const file = scriptFile(command);
    const src = file ? readFile(file) : null;
    const header = src == null ? [] : headerComment(src).lines;
    const hay = `${name}\n${command}\n${header.join('\n')}`.toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    hits.push({ name, command, file, header, inName: terms.every((t) => name.toLowerCase().includes(t)) });
  }
  hits.sort((a, b) => Number(b.inName) - Number(a.inName) || a.name.localeCompare(b.name));
  return hits.map(({ inName: _inName, ...rest }) => rest);
}

/**
 * package.json の scripts が起動するファイルのうち、冒頭コメントが無いものを返す（check-command-guidance が使う）。
 * 起動するファイルの無い script（tsc・eslint・npm run の連鎖など）と、リポジトリに無いファイルは数えない。
 * @returns {{ checked: number, missing: Array<{ name: string, file: string }> }}
 */
export function scriptsWithoutHeader({ scripts, readFile }) {
  const missing = [];
  const seen = new Set();
  let checked = 0;
  for (const [name, command] of Object.entries(scripts ?? {})) {
    const file = scriptFile(command);
    if (!file || seen.has(file)) continue;
    const src = readFile(file);
    if (src == null) continue;
    seen.add(file);
    checked += 1;
    if (headerComment(src).kind === 'none') missing.push({ name, file });
  }
  return { checked, missing };
}
