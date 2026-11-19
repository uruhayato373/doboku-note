// magazine-to-pdf の spec（各マガジンのフォルダの magazine-pdf*.json）が、置かれたフォルダと中身の参照で食い違わないこと
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs'

const specs = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--', 'content/**/magazine-pdf*.json'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  .split('\0').filter(Boolean)

test('spec は srcDir のフォルダに置かれ、articles の src がすべて実在する', () => {
  let articles = 0
  for (const rel of specs) {
    const spec = JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8'))
    assert.equal(spec.srcDir, dirname(rel), `${rel}: srcDir と置き場が違う`)
    assert.ok(Array.isArray(spec.articles) && spec.articles.length > 0, `${rel}: articles が空`)
    for (const a of spec.articles) {
      articles += 1
      assert.ok(existsSync(join(REPO_ROOT, spec.srcDir, a.src)), `${rel}: src が無い ${a.src}`)
      assert.ok(a.out, `${rel}: out が無い ${a.src}`)
    }
    if (spec.outDir) assert.ok(!spec.outDir.startsWith('/') && !/^[A-Za-z]:/.test(spec.outDir), `${rel}: outDir が絶対パス`)
  }
  console.log(`spec ${specs.length} 件・articles ${articles} 本を検査`)
  assert.ok(specs.length > 0 && articles > 0, 'spec が 0 件（検査不成立）')
})
