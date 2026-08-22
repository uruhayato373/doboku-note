// tests/mdx-io.test.mjs
//
// 回帰テスト目的:
// `.claude/scripts/lib/mdx-io.mjs` の writeMdxFile が改行コード保持を誤ると、
// pre-commit hook が mixed-EOL を検出して 100+ ファイルを reject する事故が再発する。
// CRLF/LF の保持・混在正規化を決定論的に固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readMdxFile,
  writeMdxFile,
  transformMdxFile,
} from '../.claude/scripts/lib/mdx-io.mjs';

function makeTmpFile(content) {
  const dir = mkdtempSync(join(tmpdir(), 'mdx-io-test-'));
  const path = join(dir, 'test.mdx');
  writeFileSync(path, content, 'utf-8');
  return { dir, path };
}

test('readMdxFile: CRLF ファイルを CRLF として検出する', () => {
  const { dir, path } = makeTmpFile('line1\r\nline2\r\n');
  try {
    const { raw, eol, hadCRLF } = readMdxFile(path);
    assert.equal(raw, 'line1\r\nline2\r\n');
    assert.equal(eol, '\r\n');
    assert.equal(hadCRLF, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readMdxFile: LF ファイルを LF として検出する', () => {
  const { dir, path } = makeTmpFile('line1\nline2\n');
  try {
    const { raw, eol, hadCRLF } = readMdxFile(path);
    assert.equal(raw, 'line1\nline2\n');
    assert.equal(eol, '\n');
    assert.equal(hadCRLF, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeMdxFile: CRLF を指定すると CRLF で書き戻す', () => {
  const { dir, path } = makeTmpFile('initial');
  try {
    writeMdxFile(path, 'a\nb\nc\n', '\r\n');
    const content = readFileSync(path, 'utf-8');
    assert.equal(content, 'a\r\nb\r\nc\r\n');
    assert.ok(!/(?<!\r)\n/.test(content), 'LF が単独で残っていない');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeMdxFile: 混在入力（CRLF + LF）を指定 eol に統一する（mixed-EOL 回帰）', () => {
  const { dir, path } = makeTmpFile('initial');
  try {
    const mixed = 'a\r\nb\nc\r\nd\n';
    writeMdxFile(path, mixed, '\r\n');
    const content = readFileSync(path, 'utf-8');
    assert.equal(content, 'a\r\nb\r\nc\r\nd\r\n');

    writeMdxFile(path, mixed, '\n');
    const lfContent = readFileSync(path, 'utf-8');
    assert.equal(lfContent, 'a\nb\nc\nd\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeMdxFile: eol 省略時は LF にフォールバック', () => {
  const { dir, path } = makeTmpFile('initial');
  try {
    writeMdxFile(path, 'a\r\nb\r\n');
    const content = readFileSync(path, 'utf-8');
    assert.equal(content, 'a\nb\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('transformMdxFile: identity transform は no-op で false を返す', () => {
  const { dir, path } = makeTmpFile('unchanged\r\n');
  try {
    const before = readFileSync(path, 'utf-8');
    const written = transformMdxFile(path, (raw) => raw);
    const after = readFileSync(path, 'utf-8');
    assert.equal(written, false);
    assert.equal(after, before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('transformMdxFile: null 返却で書き込みをスキップする', () => {
  const { dir, path } = makeTmpFile('keep me\r\n');
  try {
    const written = transformMdxFile(path, () => null);
    const after = readFileSync(path, 'utf-8');
    assert.equal(written, false);
    assert.equal(after, 'keep me\r\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('transformMdxFile: CRLF ファイルを加工後も CRLF のまま保持する（事故再発防止の要）', () => {
  const { dir, path } = makeTmpFile('foo\r\nbar\r\n');
  try {
    const written = transformMdxFile(path, (raw) => raw.replace('foo', 'baz'));
    assert.equal(written, true);
    const after = readFileSync(path, 'utf-8');
    assert.equal(after, 'baz\r\nbar\r\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('transformMdxFile: LF ファイルを加工後も LF のまま保持する', () => {
  const { dir, path } = makeTmpFile('foo\nbar\n');
  try {
    const written = transformMdxFile(path, (raw) => raw.replace('foo', 'baz'));
    assert.equal(written, true);
    const after = readFileSync(path, 'utf-8');
    assert.equal(after, 'baz\nbar\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
