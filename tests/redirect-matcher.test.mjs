import { test } from "node:test";
import assert from "node:assert/strict";
import { matchWildcardRedirect } from "../scripts/lib/redirect-matcher.mjs";

const rules = [
  { from: "/docs/river/*", to: "/", code: 301 },
  { from: "/posts/*", to: "https://storage.doboku-note.com/posts/:splat", code: 301 },
];

test("旧docsワイルドカードを意図した301として解決する", () => {
  assert.deepEqual(matchWildcardRedirect("/docs/river/old", rules), {
    to: "/",
    code: 301,
    matchedRule: "/docs/river/*",
  });
});

test(":splatを転送先へ展開し、queryは照合から除く", () => {
  assert.equal(
    matchWildcardRedirect("/posts/a/b.png?v=1", rules).to,
    "https://storage.doboku-note.com/posts/a/b.png",
  );
});

test("一致しないURLはnull", () => {
  assert.equal(matchWildcardRedirect("/docs/current", rules), null);
});
