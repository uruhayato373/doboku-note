/**
 * docx-text.test.mjs — 顧客添付の docx を本文テキストにする境界を固定する
 * ---------------------------------------------------------------------------
 *   - 段落ごとに改行され、1段落内で分割された run（<w:t>）が連結されるか
 *   - 実体参照（&amp; 等）を戻すか・タブ／改行要素を反映するか
 *   - docx でない zip を黙って空文字にせず例外にするか（「読めた0字」と「読めない」を区別）
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { docxToText } from '../scripts/lib/docx-text.mjs';

const docx = (bodyXml) => zipSync({
  'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${bodyXml}</w:body></w:document>`),
  '[Content_Types].xml': strToU8('<Types/>'),
});

test('段落ごとに改行し、段落内の run を連結する', () => {
  const bytes = docx(
    '<w:p><w:r><w:t>① 現場の</w:t></w:r><w:r><w:t xml:space="preserve">条件（140字）</w:t></w:r></w:p>' +
    '<w:p><w:r><w:t>漏水が1,260箇所</w:t></w:r></w:p>',
  );
  assert.equal(docxToText(bytes), '① 現場の条件（140字）\n漏水が1,260箇所');
});

test('実体参照・タブ・改行要素・空段落を反映する', () => {
  const bytes = docx('<w:p><w:r><w:t>A&amp;B&lt;C</w:t><w:tab/><w:t>D</w:t><w:br/><w:t>E</w:t></w:r></w:p><w:p/>');
  assert.equal(docxToText(bytes), 'A&B<C\tD\nE\n');
});

test('docx でない zip は例外にする', () => {
  assert.throws(() => docxToText(zipSync({ 'a.txt': strToU8('x') })), /document\.xml/);
});
