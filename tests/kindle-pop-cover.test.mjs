import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildKindlePopPrompt, kindleRatioOk, popErrors, popTexts, DEFAULT_FOOTER } from '../scripts/lib/kindle-pop-cover.mjs'
import { examPalette, loadImageRules } from '../scripts/lib/image-rules.mjs'
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs'

const POP = {
  exam: 'pe-construction', kicker: '技術士 建設部門 第二次試験', title: '道路', titleSub: '模範解答集',
  badge: ['R3〜R8', '6年分'], redBand: '令和8年度 本試験まで収録', navyBand: '全18本 フル模範解答',
  scene: '高架道路の現場', reference: 'scripts/kindle-dist/c-05.jpg',
}

test('生成指示に描く文字が全部入り、先生と画風は共通ルールから来る', () => {
  const rules = loadImageRules(REPO_ROOT)
  const prompt = buildKindlePopPrompt(POP, rules, examPalette('pe-construction', REPO_ROOT))
  for (const text of popTexts(POP)) assert.ok(prompt.includes(`「${text}」`), text)
  assert.ok(prompt.includes(rules.teacher.identity))
  assert.ok(prompt.includes(rules.formats.kindle.frame))
  assert.ok(prompt.includes('#33356B'))
  assert.ok(popTexts(POP).includes(DEFAULT_FOOTER))
})

test('必須の文言が欠けた pop は生成しない', () => {
  assert.deepEqual(popErrors(POP), [])
  const { redBand: _r, ...noRed } = POP
  assert.ok(popErrors(noRed).some((e) => e.includes('redBand')))
  assert.ok(popErrors({ ...POP, badge: ['R3〜R8'] }).some((e) => e.includes('badge')))
  assert.throws(() => buildKindlePopPrompt(noRed, loadImageRules(REPO_ROOT), 'x'))
})

test('縦横比が 5:8 から 1% を超えて外れた原本は採用しない', () => {
  assert.equal(kindleRatioOk(992, 1586), true)
  assert.equal(kindleRatioOk(1024, 1536), false)
})

test('adoptedImage のある表紙 spec は pop を持ち、制作記録が実在する', () => {
  const dir = join(REPO_ROOT, 'scripts/kindle-covers/specs')
  let checked = 0
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const spec = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    if (!spec.adoptedImage) continue
    checked += 1
    assert.deepEqual(popErrors(spec.pop), [], `${name}: pop の欠け`)
    assert.ok(readFileSync(join(REPO_ROOT, spec.adoptedImage), 'utf8').length > 0, `${name}: 制作記録が無い`)
  }
  assert.ok(checked > 0, '採用済みの表紙が 0 件（検査不成立）')
})
