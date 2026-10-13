import { test } from "node:test";
import assert from "node:assert/strict";
import { extractInternalLinkKeys, countInternalInbound } from "../scripts/lib/internal-inbound.mjs";

test("MDX 本文のリンクから内部リンクのキーを取り出す（markdown・href・外部 URL 除外・アンカー/クエリ除去）", () => {
  const text = [
    "[A](/exam/rccm/guide/overview) と [B](/practice/x/y#top)",
    '<a href="/standards/z?x=1">z</a> <Link href={"/tools/q"}>q</Link>',
    "[外部](https://example.com/a) [ルート](/)",
  ].join("\n");
  assert.deepEqual([...extractInternalLinkKeys(text)].sort(), ["/exam/rccm/guide/overview", "/practice/x/y", "/standards/z", "/tools/q"]);
});

test("リンク元は記事単位で数え、同じ記事内の重複は 1。キーワード以外のページも数える", () => {
  const files = [
    { path: "a.mdx", text: "[x](/practice/p/q) [x](/practice/p/q) [k](/exam/e/keywords/k)" },
    { path: "b.mdx", text: "[x](/practice/p/q)" },
  ];
  const c = countInternalInbound(files);
  assert.equal(c.get("/practice/p/q"), 2);
  assert.equal(c.get("/exam/e/keywords/k"), 1);
  assert.equal(c.get("/nothing"), undefined);
});

test("/docs/<slug> のリンクは正規パスにも数える", () => {
  const legacy = new Map([["/docs/old-slug", "/exam/e/guide/old-slug"]]);
  const c = countInternalInbound([{ path: "a.mdx", text: "[x](/docs/old-slug)" }], legacy);
  assert.equal(c.get("/docs/old-slug"), 1);
  assert.equal(c.get("/exam/e/guide/old-slug"), 1);
});
