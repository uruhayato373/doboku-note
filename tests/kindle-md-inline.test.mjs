// scripts/lib/kindle-md.mjs の inlineMd が note 原稿の記入例 `〇〇` を記号のまま残さないことを固定する。
// 2026-09-23: i-01 で 554 箇所、i-11 で 848 箇所のバッククォートが Kindle 本文に印字されていた。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inlineMd } from '../scripts/lib/kindle-md.mjs'

test('バッククォートの記入例は点線下線の span になり、記号は残らない', () => {
  const out = inlineMd('**工事名**：`〇〇`雨水幹線工事（`令和〇年`）')
  assert.equal(out, '<strong>工事名</strong>：<span class="fill">〇〇</span>雨水幹線工事（<span class="fill">令和〇年</span>）')
  assert.ok(!out.includes('`'))
})

test('対になっていないバッククォートと HTML 特殊文字はそのまま安全に出す', () => {
  assert.equal(inlineMd('a ` b <c>'), 'a ` b &lt;c&gt;')
})
