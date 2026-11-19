// Kindle の本のフォルダ（content/kindle/books/<書籍id>/）の spec.json・cover.json が、置き場と中身の参照で食い違わないこと
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { KINDLE_BOOKS_ROOT, REPO_ROOT } from '../scripts/lib/repository-paths.mjs'
import { kindleBookFile, kindleSpecIds, loadKindleCatalog } from '../scripts/lib/kindle-catalog.mjs'

const readJson = (rel) => JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8'))

test('spec.json の bookId はフォルダ名と同じで、sources と frontMatter が実在する', () => {
  const ids = kindleSpecIds()
  let sources = 0
  for (const id of ids) {
    const spec = readJson(kindleBookFile(id, 'spec.json'))
    assert.equal(spec.bookId, id, `${id}: bookId がフォルダ名と違う`)
    for (const src of spec.sources ?? []) {
      sources += 1
      assert.ok(existsSync(join(REPO_ROOT, src)), `${id}: sources が無い ${src}`)
    }
    if (spec.frontMatter) assert.ok(existsSync(join(REPO_ROOT, spec.frontMatter)), `${id}: frontMatter が無い ${spec.frontMatter}`)
  }
  console.log(`spec ${ids.length} 冊・sources ${sources} 本を検査`)
  assert.ok(ids.length > 0 && sources > 0, 'spec が 0 冊（検査不成立）')
})

test('cover.json の bookId は大文字小文字を除きフォルダ名と同じで、adoptedImage が実在する', () => {
  const dirs = readdirSync(KINDLE_BOOKS_ROOT).filter((d) => existsSync(join(KINDLE_BOOKS_ROOT, d, 'cover.json')))
  for (const d of dirs) {
    const cover = readJson(kindleBookFile(d, 'cover.json'))
    assert.equal(String(cover.bookId).toLowerCase(), d.toLowerCase(), `${d}: bookId がフォルダ名と違う`)
    if (cover.adoptedImage) assert.ok(existsSync(join(REPO_ROOT, cover.adoptedImage)), `${d}: adoptedImage が無い ${cover.adoptedImage}`)
  }
  console.log(`cover ${dirs.length} 冊を検査`)
  assert.ok(dirs.length > 0, 'cover が 0 冊（検査不成立）')
})

test('商品の正本の buildSpec はすべて本のフォルダの spec.json を指し、実在する', () => {
  const withSpec = loadKindleCatalog().filter((b) => b.buildSpec)
  for (const b of withSpec) {
    assert.equal(b.buildSpec, kindleBookFile(b.id, 'spec.json'), `${b.id}: buildSpec が本のフォルダを指していない`)
    assert.ok(existsSync(join(REPO_ROOT, b.buildSpec)), `${b.id}: buildSpec が無い`)
  }
  assert.ok(withSpec.length > 0, 'buildSpec を持つ本が 0 冊（検査不成立）')
})

test('表紙 spec は小文字の id でも大文字のフォルダを引く', () => {
  assert.equal(kindleBookFile('a-01', 'cover.json'), 'content/kindle/books/A-01/cover.json')
})
