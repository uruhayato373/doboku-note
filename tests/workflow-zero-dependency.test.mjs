import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

/**
 * npm ci をしないジョブが node で直接実行するスクリプトは、npm のパッケージを（間接にも）import してはいけない。
 * 2026-10-02 に indexnow-submit.mjs が台帳（scripts/lib/datasets.mjs → zod）を import し、依存ゼロのつもりの
 * indexnow-submit.yml がデプロイのたびに ERR_MODULE_NOT_FOUND で落ちた。
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');
const BUILTINS = new Set(builtinModules);
const INSTALL = /\bnpm\s+(?:ci|install|i)\b|\bnpm\s+run\s+\S*install/;
const NODE_SCRIPT = /\bnode\s+(?:--\S+\s+)*([\w./-]+\.(?:mjs|cjs|js))\b/g;
const SPECIFIER = /(?:\bimport\s+(?:[^'"`;]*?\s+from\s+)?|\bexport\s+[^'"`;]*?\s+from\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])([^'"]+)\1/g;

/** シェルのコメント行を除いた run の本文 */
const runText = (step) => String(step.run ?? '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

/** 依存を入れる前に node で実行されるスクリプト（ワークフロー相対ではなくリポジトリ相対） */
function zeroDependencyScripts() {
  const out = [];
  for (const name of readdirSync(WORKFLOWS).filter((n) => /\.ya?ml$/.test(n))) {
    const doc = yaml.load(readFileSync(join(WORKFLOWS, name), 'utf8'));
    for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        const text = runText(step);
        if (INSTALL.test(text)) break;
        for (const m of text.matchAll(NODE_SCRIPT)) out.push({ workflow: name, job: jobId, script: m[1].replace(/^\.\//, '') });
      }
    }
  }
  return out;
}

/** ローカルの import をたどり、npm のパッケージに届く経路を返す */
function packageImports(script) {
  const found = [];
  const seen = new Set();
  const visit = (file, via) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(SPECIFIER)) {
      const spec = m[2];
      if (spec.startsWith('node:') || BUILTINS.has(spec)) continue;
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const target = resolve(dirname(file), spec);
        if (existsSync(target)) visit(target, [...via, target.slice(ROOT.length + 1)]);
        continue;
      }
      found.push(`${[...via, spec].join(' → ')}`);
    }
  };
  visit(join(ROOT, script), [script]);
  return found;
}

test('npm ci をしないジョブが実行するスクリプトは npm のパッケージを import しない', () => {
  const scripts = zeroDependencyScripts().filter((s) => existsSync(join(ROOT, s.script)));
  assert.ok(scripts.length > 0, '依存ゼロで実行されるスクリプトを 1 本も見つけられなかった（検査不成立）');
  const problems = scripts.flatMap((s) => packageImports(s.script).map((p) => `${s.workflow}（${s.job}）: ${p}`));
  assert.deepEqual(problems, []);
});
