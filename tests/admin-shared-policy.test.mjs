// 管理画面「共通方針」が、配布された共有 SSOT を漏れなく可視化できる状態かを機械で守る。
//
// 索引（/strategy/policy）は manifest.json の docs を回して描くだけなので、obsidian 側で文書を 1 本
// 足して配布すれば画面にも出る——その前提が崩れる 2 通りをここで止める:
//   1. manifest の文書に title / summary / 実体が無い（配布時に sync.mjs が拒否するが、写しを手で壊した場合の網）
//   2. ページ側が manifest を読まずにファイル名や見出しをハードコードし始めた（2026-09-15 に撤去した LABELS 表の再発）
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIR = join(ROOT, ".claude/shared-policy");
const ADMIN = join(ROOT, "tools/admin-app/src");

test("配布された共有 SSOT は全て title / summary / 実体を持つ（索引カードに出せる）", () => {
  const manifest = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"));
  assert.ok(manifest.docs && Object.keys(manifest.docs).length >= 3, "manifest.docs に 3 文書以上");
  for (const [name, d] of Object.entries(manifest.docs)) {
    assert.ok(existsSync(join(DIR, name)), `${name} の実体が無い`);
    assert.ok(d.title && d.summary, `${name} に title / summary が無い（正本の frontmatter に書く）`);
    assert.match(d.sourcePath, /^memos\/.+SSOT\.md$/, `${name} の正本パスが memos/ 配下でない`);
  }
});

test("索引ページと個別ページは manifest 駆動（文書名・見出しをハードコードしない）", () => {
  const index = readFileSync(join(ADMIN, "app/strategy/policy/page.tsx"), "utf8");
  const detail = readFileSync(join(ADMIN, "app/strategy/policy/[...path]/page.tsx"), "utf8");
  const lib = readFileSync(join(ADMIN, "lib/shared-policy.ts"), "utf8");
  assert.match(index, /sharedPolicyDocs\(\)/, "索引は sharedPolicyDocs() を回す");
  assert.match(detail, /sharedPolicyDoc\(/, "個別ページは sharedPolicyDoc(slug) で解決する");
  assert.match(lib, /manifest\.docs/, "一覧の出どころは manifest.docs");
  for (const src of [index, detail, lib]) {
    assert.doesNotMatch(src, /LABELS|共通事業方針（HARM）|売れる 9 型/, "見出し・説明を admin 側に写さない（正本の frontmatter が唯一の出どころ）");
  }
});
