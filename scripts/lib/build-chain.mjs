/**
 * build-chain — サイトのビルドの手順（package.json の build と prebuild が npm run でたどるスクリプト）が実行する
 * ファイルを返す（DN-0803）。E2E の起動条件（.github/workflows/e2e.yml の paths）に、ビルドの手順のスクリプトが
 * 全部入っているかを tests/e2e-paths.test.mjs が確かめるのに使う。手で写した一覧と手順がずれないようにする。
 *
 * @param {Record<string, string>} scripts package.json の scripts
 * @param {string[]} [entries] たどり始める npm script
 * @returns {string[]} 実行されるファイル（リポジトリ相対・重複なし・名前順）
 */
export function buildChainFiles(scripts, entries = ['prebuild', 'build']) {
  const files = new Set();
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name) || !scripts[name]) return;
    seen.add(name);
    for (const part of scripts[name].split(/&&|\|\|/).map((s) => s.trim())) {
      const run = /^npm run (?:-s )?([\w:.-]+)/.exec(part);
      if (run) { visit(run[1]); continue; }
      const file = /^(?:node|tsx)\s+(\S+\.(?:mjs|cjs|js|ts|mts))/.exec(part);
      if (file) files.add(file[1]);
    }
  };
  for (const e of entries) visit(e);
  return [...files].sort();
}
