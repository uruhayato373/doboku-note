// 広告リンク（rel=sponsored）は必ずリファラ方針を対で持つ。
// 欠けるとサイト既定の strict-origin-when-cross-origin で ASP にドメインしか届かず、
// A8 の成果別レポートでどのページの広告から成果が出たか分からなくなる（2026-10-05 の成果で発生）。
// クリック計測は中クリック（auxclick）も拾う。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const DEFINITION = join("src", "components", "ui", "AffiliateParts.tsx");
const files = walk("src").filter((p) => p !== DEFINITION);

test("広告リンクの rel と referrerPolicy が対になっている", () => {
  let anchors = 0;
  for (const p of files) {
    const src = readFileSync(p, "utf8");
    assert.doesNotMatch(src, /^\s+rel="[^"]*sponsored/m, `${p}: rel の直書きをやめて AFFILIATE_LINK_REL を使う`);
    const rels = src.match(/rel=\{[^}\n]*AFFILIATE_LINK_REL[^}\n]*\}/g) ?? [];
    const policies = src.match(/referrerPolicy=\{[^}\n]*AFFILIATE_LINK_REFERRER_POLICY[^}\n]*\}/g) ?? [];
    assert.equal(policies.length, rels.length, `${p}: rel=AFFILIATE_LINK_REL ${rels.length} 件に対し referrerPolicy ${policies.length} 件`);
    anchors += rels.length;
  }
  // 検査 0 件の緑を PASS にしない（広告リンクは CareerAffiliate・SidebarAdBanner・OffsiteCta・/links の 4 箇所以上）
  assert.ok(anchors >= 4, `検査した広告リンクが ${anchors} 件しかない`);
});

test("リファラ方針は URL を ASP へ渡す値", () => {
  const src = readFileSync(DEFINITION, "utf8");
  assert.match(src, /AFFILIATE_LINK_REFERRER_POLICY = "no-referrer-when-downgrade"/);
});

test("クリック計測は中クリック（auxclick）も拾う", () => {
  const src = readFileSync(join("src", "components", "providers", "AnalyticsProvider.tsx"), "utf8");
  assert.match(src, /addEventListener\("auxclick", onClick/);
  assert.match(src, /e\.type === "auxclick" && e\.button !== 1/);
});
