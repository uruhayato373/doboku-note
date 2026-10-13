// DN-0562: Kindle の配布 EPUB・表紙（scripts/kindle-dist）は private R2 が正本で、git には README だけを置く。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadConfig, groupFor } from '../scripts/lib/asset-storage.mjs'
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs'

test('kindle-dist group: private R2・audience ci で EPUB と jpg に一致し、README は対象外', () => {
  const g = loadConfig().groups.find((x) => x.id === 'kindle-dist')
  assert.ok(g, 'asset-storage.json に kindle-dist group が要る')
  assert.equal(g.audience, 'ci')
  assert.equal(g.bucket, 'private')
  assert.equal(groupFor('scripts/kindle-dist/e-01.epub', loadConfig())?.id, 'kindle-dist')
  assert.equal(groupFor('scripts/kindle-dist/e-01.jpg', loadConfig())?.id, 'kindle-dist')
  assert.equal(groupFor('scripts/kindle-dist/README.md', loadConfig()), null)
})

test('git 追跡: scripts/kindle-dist は README だけ（EPUB・表紙の再追跡を止める）', () => {
  const tracked = execFileSync('git', ['ls-files', 'scripts/kindle-dist'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n').filter(Boolean)
  assert.deepEqual(tracked, ['scripts/kindle-dist/README.md'])
})

test('CI: quality:audit:ci の前に kindle-dist を private R2 から取り戻す', () => {
  const ci = readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8')
  const hydrate = ci.indexOf('asset-hydrate.mjs --group kindle-dist')
  const audit = ci.indexOf('npm run quality:audit:ci')
  assert.ok(hydrate > 0, 'ci.yml に asset-hydrate --group kindle-dist が要る')
  assert.ok(hydrate < audit, '取り戻しは検査より前')
})
