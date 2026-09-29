import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { loadBannerReferences, matchBannerBuffer } from "../scripts/lib/author-banner-match.mjs";

const REFERENCE_DIR = "content/note/共通/著者オーソリティ/img";
const references = await loadBannerReferences(REFERENCE_DIR);
const match = (path) => matchBannerBuffer(readFileSync(path), references);

test("原本3版はそれぞれ自分の版に一致する", async () => {
  assert.equal((await match(`${REFERENCE_DIR}/figure-author-authority-pop.png`)).variant, "pop");
  assert.equal((await match(`${REFERENCE_DIR}/figure-author-authority.png`)).variant, "standard");
  assert.equal((await match(`${REFERENCE_DIR}/legacy-author-authority-16x9.png`)).variant, "legacy");
});

test("H2 より前にある 16:9 の本文図は旧バナーと判定しない（DN-0455）", async () => {
  // 経験記述R6新形式（n3a5866854425）で旧バナーとして削除対象になっていた新旧形式の比較図
  const result = await match("content/note/1級・2級土木/2級土木/経験記述R6新形式/img/figure-1-format-comparison.png");
  assert.equal(result.variant, "unknown");
  assert.ok(result.distances.legacy >= 25, `legacy distance=${result.distances.legacy}`);
});
