/**
 * workflow_run の workflows（引き金のワークフローの名前）が、実在するワークフローの name: に名前どおり一致するかを固定する。
 *
 * 守りたい事故（DN-0848）: workflows の名前は glob のパターンとして照合される（`*`・`**`・`+`・`?`・`!`・`[]` が特別）。
 *   automerge.yml が "Pre-merge check (quality audit + build)" をそのまま書いていたため `+` が「直前の文字の 1 回以上」になり、
 *   Pre-merge の完了では一度も起動しなかった（記録の残る 10-09〜10-25 の完了 999 回で 0 回）。ラベルを付けた PR は、
 *   E2E・Lighthouse が Pre-merge より後に終わったときだけ入り、E2E・Lighthouse が走らない PR は緑でも入らなかった。
 *   特別な文字は `\` でエスケープする（YAML の二重引用符では `\+` が不正なので単一引用符で書く）。括弧は特別ではない
 *   （"Deploy to production (Cloudflare Pages)" を引き金にする旧 indexnow-submit・production-sweep は起動していた。今は uptime-ping の sweep ジョブ）。
 *
 * パターン（`*` など）で複数のワークフローを指す書き方は使っていないので、ここでは名前どおりの一致だけを認める。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import yaml from 'js-yaml';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const WORKFLOW_DIR = join(ROOT, '.github/workflows');
const SPECIAL = new Set(['*', '+', '?', '!', '[', ']']);

/** glob の特別な文字のエスケープを外す。エスケープしていない特別な文字があれば null */
function literalWorkflowName(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) { out += pattern[i + 1]; i += 1; continue; }
    if (SPECIAL.has(c)) return null;
    out += c;
  }
  return out;
}

function loadWorkflows() {
  return readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f)).map((file) => ({ file, doc: yaml.load(readFileSync(join(WORKFLOW_DIR, file), 'utf8')) }));
}

test('literalWorkflowName: エスケープしていない + は null・エスケープすれば文字どおり・括弧はそのまま', () => {
  assert.equal(literalWorkflowName('Pre-merge check (quality audit + build)'), null);
  assert.equal(literalWorkflowName('Pre-merge check (quality audit \\+ build)'), 'Pre-merge check (quality audit + build)');
  assert.equal(literalWorkflowName('Deploy to production (Cloudflare Pages)'), 'Deploy to production (Cloudflare Pages)');
  assert.equal(literalWorkflowName('Build*'), null);
});

test('workflow_run の workflows は、実在するワークフローの name: に名前どおり一致する（DN-0848）', () => {
  const workflows = loadWorkflows();
  const names = new Set(workflows.map((w) => w.doc?.name).filter(Boolean));
  const filters = workflows.flatMap(({ file, doc }) => (doc?.on?.workflow_run?.workflows ?? []).map((pattern) => ({ file, pattern })));
  assert.ok(filters.length >= 3, `workflow_run の引き金が ${filters.length} 件しか読めない（検査不成立）`);
  const bad = filters.flatMap(({ file, pattern }) => {
    const name = literalWorkflowName(pattern);
    if (name === null) return [`${file}: "${pattern}" にエスケープしていない glob の特別な文字がある（\\ を前に付ける）`];
    if (!names.has(name)) return [`${file}: "${pattern}" に当たるワークフローの name: が無い（名前を変えたら引き金も直す）`];
    return [];
  });
  assert.deepEqual(bad, []);
});

test('automerge は Pre-merge・E2E・Lighthouse の 3 本の完了で起動する', () => {
  const doc = yaml.load(readFileSync(join(WORKFLOW_DIR, 'automerge.yml'), 'utf8'));
  const literal = doc.on.workflow_run.workflows.map(literalWorkflowName);
  assert.deepEqual(literal, ['Pre-merge check (quality audit + build)', 'Playwright E2E', 'Lighthouse CI']);
});
