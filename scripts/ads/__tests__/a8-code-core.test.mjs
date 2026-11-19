import assert from "node:assert/strict";
import test from "node:test";

import {
  extractHref,
  extractA8mat,
  extractImageUrl,
  extractPixelUrl,
  extractSize,
  isCanonicalSize,
  parseA8Code,
} from "../lib/a8-code-core.mjs";

const BANNER_CODE = `
<a href="https://px.a8.net/svt/ejp?a8mat=4AZA46+97MGQA+5I2U+60H7L" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www25.a8.net/svt/bgt?aid=260306934557&wid=001&eno=01&mid=s00000025671001010000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4AZA46+97MGQA+5I2U+60H7L" alt="">
`;

const TEXT_CODE = `
<a href="https://px.a8.net/svt/ejp?a8mat=4B5LK5+6PQ0DU+47GS+HVNAP" rel="nofollow">施工管理の転職はこちら</a>
<img border="0" width="1" height="1" src="https://www12.a8.net/0.gif?a8mat=4B5LK5+6PQ0DU+47GS+HVNAP" alt="">
`;

const NONCANONICAL_CODE = `
<a href="https://px.a8.net/svt/ejp?a8mat=XXXX+YYYY+ZZZZ+WWWW">
<img width="160" height="600" src="https://www01.a8.net/svt/bgt?aid=1&wid=1&eno=1&mid=1&mc=1"></a>
<img width="1" height="1" src="https://www01.a8.net/0.gif?a8mat=XXXX+YYYY+ZZZZ+WWWW">
`;

test("extractHref: A8 クリック URL を抽出", () => {
  assert.equal(extractHref(BANNER_CODE), "https://px.a8.net/svt/ejp?a8mat=4AZA46+97MGQA+5I2U+60H7L");
  assert.equal(extractHref("no a8 here"), null);
});

test("extractA8mat: a8mat トークン", () => {
  assert.equal(extractA8mat(BANNER_CODE), "4AZA46+97MGQA+5I2U+60H7L");
});

test("extractImageUrl: bgt バナー画像のみ (0.gif は除外)", () => {
  const img = extractImageUrl(BANNER_CODE);
  assert.ok(img.includes("svt/bgt"));
  assert.ok(!img.includes("0.gif"));
  assert.equal(extractImageUrl(TEXT_CODE), null); // テキストは画像なし
});

test("extractPixelUrl: 0.gif ピクセル", () => {
  assert.ok(extractPixelUrl(BANNER_CODE).includes("0.gif"));
  assert.ok(extractPixelUrl(TEXT_CODE).includes("0.gif"));
});

test("extractSize: バナー画像の width/height (1x1 pixel は無視)", () => {
  assert.deepEqual(extractSize(BANNER_CODE), { width: 300, height: 250 });
  assert.deepEqual(extractSize(TEXT_CODE), { width: null, height: null });
});

test("isCanonicalSize: 4種 canonical + text(null)", () => {
  assert.equal(isCanonicalSize(300, 250), true);
  assert.equal(isCanonicalSize(250, 250), true);
  assert.equal(isCanonicalSize(320, 100), true);
  assert.equal(isCanonicalSize(null, null), true); // text
  assert.equal(isCanonicalSize(160, 600), false);
});

test("parseA8Code: バナー → ok + fields (doboku GKS mat と同形)", () => {
  const r = parseA8Code(BANNER_CODE);
  assert.equal(r.ok, true);
  assert.equal(r.fields.adType, "banner");
  assert.equal(r.fields.width, 300);
  assert.equal(r.fields.height, 250);
  assert.ok(r.fields.htmlContent.includes("px.a8.net/svt/ejp"));
  assert.ok(r.fields.imageUrl.includes("svt/bgt"));
  assert.ok(r.fields.trackingPixelUrl.includes("0.gif"));
});

test("parseA8Code: テキスト → ok + adType text + size null", () => {
  const r = parseA8Code(TEXT_CODE);
  assert.equal(r.ok, true);
  assert.equal(r.fields.adType, "text");
  assert.equal(r.fields.width, null);
  assert.equal(r.fields.imageUrl, null);
});

test("parseA8Code: non-canonical サイズ → ok:false", () => {
  const r = parseA8Code(NONCANONICAL_CODE);
  assert.equal(r.ok, false);
  assert.match(r.error, /non-canonical-size:160x600/);
});

test("parseA8Code: 空/クリックURL無し → ok:false", () => {
  assert.equal(parseA8Code("").ok, false);
  assert.equal(parseA8Code("<a href='https://example.com'>x</a>").ok, false);
});
