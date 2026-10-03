// tests/site-identity.test.mjs
//
// サイト・アカウントの識別子の一本化（src/config/site-identity.mjs が唯一の定義・scripts/lib/site-identity.mjs が再公開）を固定する。
// 守りたい事故: 識別子をコードが書き写し、値が動いたとき直し漏れた側が古いまま動き続ける
// （2026-08-13: 旧 note URL が YouTube 概要欄 32 本に出た・x-repost の ownHandle が凍結アカウントのままだった）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as shared from '../src/config/site-identity.mjs';
import * as scriptSide from '../scripts/lib/site-identity.mjs';
import { SITE_ORIGIN as siteLinksOrigin } from '../scripts/lib/site-links.mjs';
import { SITE_ORIGIN as seoChecksOrigin } from '../scripts/lib/seo-checks.mjs';
import { findIdentityLiterals, isIdentityScanTarget } from '../scripts/lib/identity-literals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

test('サイトの識別子は host から導かれ、末尾スラッシュを持たない', () => {
  assert.equal(shared.SITE_ORIGIN, `https://${shared.SITE_HOST}`);
  assert.equal(shared.GSC_PROPERTY, `sc-domain:${shared.SITE_HOST}`);
  assert.equal(shared.R2_PUBLIC_ORIGIN, `https://${shared.R2_PUBLIC_HOST}`);
  assert.equal(shared.NOTE_BASE, `https://note.com/${shared.NOTE_CREATOR}`);
  for (const value of [shared.SITE_ORIGIN, shared.R2_PUBLIC_ORIGIN, shared.NOTE_BASE]) assert.ok(!value.endsWith('/'), value);
});

test('スクリプト側は src 側と同じ値を再公開し、旧来の SITE_ORIGIN の export も同じ値を指す', () => {
  for (const key of ['SITE_HOST', 'SITE_ORIGIN', 'GSC_PROPERTY', 'R2_PUBLIC_HOST', 'R2_PUBLIC_ORIGIN', 'NOTE_CREATOR', 'NOTE_BASE']) {
    assert.equal(scriptSide[key], shared[key], key);
  }
  assert.equal(siteLinksOrigin, shared.SITE_ORIGIN);
  assert.equal(seoChecksOrigin, shared.SITE_ORIGIN);
});

test('R2 の公開ホストは config/asset-storage.json の buckets.public.publicHost と一致する（サイトのバンドルに載せられないので写しを検査で止める）', () => {
  assert.equal(readJson('config/asset-storage.json').buckets.public.publicHost, shared.R2_PUBLIC_HOST);
});

test('X・Instagram のハンドルは config が正本で、スクリプト側はそれを読む', () => {
  const x = readJson('config/x-account.json');
  const ig = readJson('config/ig-account.json');
  assert.equal(scriptSide.X_HANDLE, x.handle);
  assert.equal(scriptSide.X_PROFILE_URL, x.profileUrl);
  assert.ok(x.profileUrl.endsWith(`/${x.handle}`), 'X のプロフィール URL はハンドルで終わる');
  assert.equal(scriptSide.IG_HANDLE, ig.handle);
  assert.ok(ig.profileUrl.includes(`/${ig.handle}/`), 'Instagram のプロフィール URL はハンドルを含む');
});

test('config 内の note・サイトの URL は定義と同じ origin・クリエイターを指す', () => {
  const funnel = readJson('config/note-funnel.json');
  const noteUrls = [funnel.L1.noteUrl, ...Object.values(funnel.exams).map((e) => e.L2?.noteUrl).filter(Boolean)];
  assert.ok(noteUrls.length > 1);
  for (const url of noteUrls) assert.ok(url.startsWith(`${shared.NOTE_BASE}/`), url);
  for (const file of ['config/x-account.json', 'config/ig-account.json']) {
    const { websiteUrl } = readJson(file).profile;
    assert.ok(websiteUrl.startsWith(`${shared.SITE_ORIGIN}/`), `${file}: ${websiteUrl}`);
  }
});

// ---- 再宣言の検出（check-dead-handles が使う） ----------------------------------

const lineHits = (line) => findIdentityLiterals(`${line}\n`).map((h) => h.use.split('（')[0]);

test('識別子を値として書き写す行を止める（宣言・プロパティ・既定引数・比較）', () => {
  assert.deepEqual(lineHits("const SITE = 'https://doboku-note.com';"), ['SITE_ORIGIN']);
  assert.deepEqual(lineHits('export const BASE: string = "https://doboku-note.com/";'), ['SITE_ORIGIN']);
  assert.deepEqual(lineHits("  domainUrl: 'https://doboku-note.com',"), ['SITE_ORIGIN']);
  assert.deepEqual(lineHits('function f(origin = "https://doboku-note.com") {}'), ['SITE_ORIGIN']);
  assert.deepEqual(lineHits("  noteUrl: 'https://note.com/dobokunote/',"), ['NOTE_BASE']);
  assert.deepEqual(lineHits("const CREATOR = 'dobokunote';"), ['NOTE_CREATOR']);
  assert.deepEqual(lineHits('const SITE_URL = "sc-domain:doboku-note.com";'), ['GSC_PROPERTY']);
  assert.deepEqual(lineHits("const R2_BASE = 'https://storage.doboku-note.com';"), ['R2_PUBLIC_ORIGIN']);
  assert.deepEqual(lineHits("const ACCOUNT = 'doboku373';"), ['X_HANDLE']);
  assert.deepEqual(lineHits("if (meta.account !== 'dobokunotecom') fail();"), ['IG_HANDLE']);
});

test('データとしての URL・説明・意図した行は止めない', () => {
  assert.deepEqual(lineHits("url: 'https://doboku-note.com/about',"), [], '記事 1 本分の URL はデータ');
  assert.deepEqual(lineHits("noteUrl: 'https://note.com/dobokunote/n/n296a88f64ac2',"), [], 'マガジン・記事の URL はデータ');
  assert.deepEqual(lineHits('const url = `${SITE_ORIGIN}/about`;'), [], '定数から組み立てる行');
  assert.deepEqual(lineHits("// const SITE = 'https://doboku-note.com'; はやらない"), [], 'コメント');
  assert.deepEqual(lineHits(" * const CREATOR = 'dobokunote'"), [], 'ブロックコメントの中');
  assert.deepEqual(lineHits("const x = 1; // 旧: const SITE = 'https://doboku-note.com'"), [], '行末コメント');
  assert.deepEqual(lineHits("const SITE = 'https://doboku-note.com'; // identity-literal-ok: 旧ドメインの照合"), [], '理由つきの例外');
  assert.deepEqual(lineHits("const self = readAccount().sellerName || 'dobokunote';"), [], 'ココナラの出品者名と同じ綴り（宣言の右辺ではない）');
  assert.deepEqual(lineHits("function parse(text, { self = 'dobokunote' } = {}) {}"), [], '既定引数はココナラの出品者名と区別できないので止めない');
});

test('走査するのはコードだけ（定義・テスト・fixture・docs は対象外）', () => {
  assert.equal(isIdentityScanTarget('scripts/generate-rss.mjs'), true);
  assert.equal(isIdentityScanTarget('src/lib/metadata.ts'), true);
  assert.equal(isIdentityScanTarget('.claude/scripts/lib/sns-common/sns-config.mjs'), true);
  assert.equal(isIdentityScanTarget('tools/admin-app/src/app/materials/page.tsx'), true);
  assert.equal(isIdentityScanTarget('.claude/scripts/youtube/publish-video-pack.cjs'), true);
  assert.equal(isIdentityScanTarget('src/config/site-identity.mjs'), false, '定義そのもの');
  assert.equal(isIdentityScanTarget('scripts/lib/site-identity.mjs'), false, '定義そのもの');
  assert.equal(isIdentityScanTarget('tests/site-links.test.mjs'), false);
  assert.equal(isIdentityScanTarget('e2e/cta.spec.ts'), false);
  assert.equal(isIdentityScanTarget('docs/strategy/01_プロダクト戦略.md'), false);
  assert.equal(isIdentityScanTarget('config/x-account.json'), false);
});
