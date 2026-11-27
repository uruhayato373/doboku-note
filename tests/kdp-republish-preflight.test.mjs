/**
 * kdp-publish の再出版（表紙差し替え・原稿差し替え・--publish-only）が共用する、出版を押す前の価格ページの検証（DN-1310）。
 * 2026-11-27、c-I の原稿差し替えのあと --publish-only が価格ページへ直行して「この項目は必須です」×2 で止まった。
 * 出版はどのモードも content を経由する republishFromContent に寄せ、押す前の判定はこの純粋関数 1 つで行う。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs'
import { publishPreflightIssue } from '../scripts/lib/kdp-common.mjs'

const PRICING = 'https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/ABC123/pricing'

test('価格ページで価格が期待どおりなら押してよい', () => {
  assert.equal(publishPreflightIssue({ url: PRICING, price: '490' }, { expectPrice: 490 }), null)
  assert.equal(publishPreflightIssue({ url: PRICING, price: '490', royalty: '70_PERCENT' }, { expectPrice: '490', expectRoyalty: '70_PERCENT' }), null)
})

test('価格ページに着いていない（content へ戻された）なら押さない', () => {
  assert.match(publishPreflightIssue({ url: PRICING.replace('pricing', 'content'), price: '490' }, { expectPrice: 490 }), /価格ページに到達できない/)
})

test('価格・ロイヤリティの不一致や読めないときは押さない', () => {
  assert.match(publishPreflightIssue({ url: PRICING, price: '990' }, { expectPrice: 490 }), /JP 価格/)
  assert.match(publishPreflightIssue({ url: PRICING, price: '' }, { expectPrice: 490 }), /読めず/)
  assert.match(publishPreflightIssue({ url: PRICING, price: '490', royalty: '35_PERCENT' }, { expectPrice: 490, expectRoyalty: '70_PERCENT' }), /ロイヤリティ/)
  assert.match(publishPreflightIssue({ url: PRICING, price: '' }, { expectPrice: undefined }), /期待する価格が無い/)
})

test('原稿差し替え・表紙差し替え・--publish-only の出版は、どれも content を経由する共通の手順を通る', () => {
  const src = readFileSync(join(REPO_ROOT, 'scripts/kindle/kdp-publish.mjs'), 'utf8')
  const calls = src.match(/await republishFromContent\(/g) || []
  assert.equal(calls.length, 3, 'cover・update・pub の 3 か所から呼ぶ')
  const publishOnly = src.slice(src.indexOf('if (MODE_PUBLISH_ONLY) {'), src.indexOf('新規提出フロー'))
  assert.ok(publishOnly.includes('republishFromContent'), '--publish-only が共通の手順を呼ぶ')
  assert.ok(!/\/pricing`/.test(publishOnly), '--publish-only が価格ページへ直行しない')
  const fn = src.slice(src.indexOf('async function republishFromContent'))
  assert.ok(fn.indexOf('affirmUploadAnswers') < fn.indexOf("locator('#save-and-continue-announce').click"),'確認チェックを付けてから「保存して続行」')
  assert.ok(fn.indexOf('publishPreflightIssue') < fn.indexOf('#save-and-publish'), '価格の検証の後に出版ボタン')
})
