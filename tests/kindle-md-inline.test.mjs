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

test('note 原稿の m<sup>3</sup> は上付きタグとして通す（文字列化しない）', () => {
  assert.equal(inlineMd('盛土量 12,000m<sup>3</sup>'), '盛土量 12,000m<sup>3</sup>')
  assert.equal(inlineMd('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;')
})

// 2026-09-28: 原稿の目印が【〇〇】（DN-0277 で統一）と素の 〇〇 にも分かれ、j-13/j-14/j-15 などで記号のまま印字されていた。
test('【〇〇】と素の 〇〇 も点線下線にする', () => {
  assert.equal(inlineMd('【〇〇】川 床止め工事'), '<span class="fill">〇〇</span>川 床止め工事')
  assert.equal(inlineMd('令和〇年〇月'), '令和<span class="fill">〇</span>年<span class="fill">〇</span>月')
  assert.equal(inlineMd('【注意】**品質**'), '【注意】<strong>品質</strong>')
})
