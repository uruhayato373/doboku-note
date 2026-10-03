import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// 退避アセットの group（config/drive-vault.json・config/asset-storage.json）の requiredBy・generator が指すパスの実在。
// 書き手のスクリプトを移した（.claude/scripts/youtube/ → .claude/skills/social/yt-shorts-create/scripts/）のに台帳が古い名前のまま残り、
// 誰も気づかなかった。先頭がリポジトリのパスの形（scripts/・src/・.claude/ …）の項目は、実在するものだけを書く。
// 文章の項目（「…（人）」「npm run …」）は対象外。
const PATH_HEAD = /^(?:scripts|src|config|data|\.claude|tools|tests|content)\//;

function pathsOf(file) {
  const cfg = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const out = [];
  for (const g of cfg.groups ?? []) {
    for (const key of ['requiredBy', 'generator']) {
      const v = g[key];
      for (const item of Array.isArray(v) ? v : v ? [v] : []) {
        const head = String(item).split(/[（(\s]/)[0];
        if (PATH_HEAD.test(head)) out.push({ where: `${file} ${g.id}.${key}`, path: head });
      }
    }
  }
  return out;
}

test('退避アセットの group が指すパスはすべて実在する（検査対象 0 件を合格にしない）', () => {
  const all = ['config/drive-vault.json', 'config/asset-storage.json'].flatMap(pathsOf);
  assert.ok(all.length >= 15, `パスの形の項目が少なすぎる（読み取りの破損を疑う）: ${all.length}`);
  const missing = all.filter((x) => !existsSync(join(ROOT, x.path))).map((x) => `${x.where}: ${x.path}`);
  assert.deepEqual(missing, [], '実在しないパス。書き手・読み手を移したら台帳も直す');
});
