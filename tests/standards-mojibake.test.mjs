import test from 'node:test';
import assert from 'node:assert/strict';
import { measureMojibake, splitLibraryPages } from '../scripts/lib/standards-mojibake.mjs';

test('フォントの文字対応が壊れたページ（制御文字・無関係な記号）を文字化けと判定する', () => {
  // 関東の電子書類作成マニュアル（制御文字と ASCII 記号の並び）
  assert.equal(measureMojibake('123456789 \u000e\u000f\u0010\u0011\u0012 \u0013\u0014\u0015\u0016\u0017\u0018 \u001b\u001c\u001d #$%3478&\'()*+,,,,,,').garbled, true);
  // 沖縄の必携（ู ᵝ Ũ 㻝 のような関係の無い文字の範囲）
  assert.equal(measureMojibake('ู⾲ ᵝᘧ 1 㻝㻝㻠㼏㼙 ƝᡕषǛƓƔƚƠǇƢ ŨŨŨŨŨŨǛ ƳƓƠƯƍǇƢ ࠯঺Ũ࠰ŨஉŨଐǇư').garbled, true);
});

test('目次の点線・数式の上線と添字・単位記号は文字化けにしない', () => {
  assert.equal(measureMojibake('3-2-6-1 一般事項 ··················································· 60\n3-2-6-5 舗装準備工 ···································· 61').garbled, false);
  assert.equal(measureMojibake('平均値 x̄ = (x₁ + x₂ + … + xₙ) / n　Σᵢ₌₁ⁿ xᵢ　規格値 ±5㎜　面積 4㎡　①②③ Ⅱ ℓ → °C').garbled, false);
  assert.equal(measureMojibake('受注者は、工事関係書類の作成に当たっては、「土木工事書類作成マニュアル」によることとする。').garbled, false);
});

test('全文ライブラリの分冊をページに割る', () => {
  const markdown = [
    '# 文書 — PDF pages 1-2', '', '## PDF page 1', '', '<!-- extraction: pdftotext-layout; review: dual-extraction-checked -->', '',
    '```text', '本文 1', '```', '', '## PDF page 2', '', '<!-- extraction: visual-review; status: visual-transcribed; batch: b -->', '',
    '````text', '本文 ``` 2', '````', '',
  ].join('\n');
  const pages = splitLibraryPages(markdown);
  assert.deepEqual(pages.map((p) => [p.page, p.text.trim()]), [[1, '本文 1'], [2, '本文 ``` 2']]);
  assert.match(pages[1].marker, /visual-transcribed/);
});
