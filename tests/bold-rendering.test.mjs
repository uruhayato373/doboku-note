/**
 * fix-bold-rendering の修正規則のテスト。
 *
 * この fixer は開発中に4回作り直しており、いずれも「動くように見えて
 * 中身が壊れている」種類の失敗だった（強調範囲がずれる／括弧の対応が切れる／
 * 修正件数が実変更行数と食い違う／空回りする）。同じ形で再発させないため、
 * 規則ごとの期待値と、実際に踏んだ4つの回帰を固定する。
 *
 * 判定は「直った」と主張するだけでなく renderStats で実際にパースし、
 * リテラルの ** が消えていることを確認する（描画結果が根拠）。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fixLine, renderStats } from "../scripts/fix-bold-rendering.mjs";

/** 修正後の行が「アスタリスクが残っていない」ことを実パースで確認する */
function assertRenders(line, msg) {
  const st = renderStats(line);
  assert.equal(st.failed ?? false, false, `parse failed: ${line}`);
  assert.equal(st.literal, 0, msg ?? `literal ** remains: ${line}`);
}

test("規則1: 末尾の丸括弧グループを ** の外へ出す", () => {
  const src = "資格が、**技術士（建設部門）**と RCCM です。";
  const { line, fixed } = fixLine(src);
  assert.equal(line, "資格が、**技術士**（建設部門）と RCCM です。");
  assert.equal(fixed, 1);
  assertRenders(line);
});

test("規則2: 末尾の句読点を ** の外へ出す", () => {
  const src = "3. **火薬類が残った場合には，**その都度返送する。";
  const { line } = fixLine(src);
  assert.equal(line, "3. **火薬類が残った場合には**，その都度返送する。");
  assertRenders(line);
});

test("規則0: 中身に文字が無い強調はデリミタごと削除する", () => {
  // 開き ** が left-flanking にならず、アスタリスクが本文に出ていた形
  const src = "4. 荷重をかけてはならない**。 ❌**";
  const { line } = fixLine(src);
  assert.equal(line, "4. 荷重をかけてはならない。 ❌");
  assertRenders(line);
});

test("規則0: 壊れたリンク **[**表題](url) はリンクごと正常化する", () => {
  const src = "5. **[**情報公開法第7条](https://example.com/a)の規定として正しい";
  const { line } = fixLine(src);
  assert.ok(line.includes("[情報公開法第7条](https://example.com/a)"), line);
  assert.ok(!line.includes("**[**"), line);
  assertRenders(line);
});

test("規則3: 内側へ紛れ込んだ [ を外へ出す（閉じ括弧は巻き込まない）", () => {
  // 回帰: 約物ランが「」（[」を丸ごと飲み込み、「義務」の対応の途中で
  // 太字が切れて **……「義務**」（[ になっていた
  const src =
    "3. **雇い入れ時の教育は「推奨」ではなく「義務」（[**労働安全衛生法第59条](https://example.com/b)）";
  const { line } = fixLine(src);
  assert.ok(line.includes("「義務」**"), `鉤括弧の対応が壊れている: ${line}`);
  assert.ok(!line.includes("「義務**」"), `太字が引用句の途中で切れている: ${line}`);
  assertRenders(line);
});

test("鉤括弧で終わる強調は触らない（強調の主眼がずれるため人へ回す）", () => {
  const src = "重要なのは、**制度の有無より「実際に使われているか」**です。";
  const { line, fixed } = fixLine(src);
  // 空白挿入で flanking を成立させるのは可。強調範囲を削ってはいけない。
  assert.ok(
    line.includes("**制度の有無より「実際に使われているか」**"),
    `強調範囲が変わっている: ${line}`
  );
  assert.ok(fixed >= 0);
  assertRenders(line);
});

test("単位付き数値は分断しない（**60%** → **60**% にしない）", () => {
  const src = "合格基準は**おおむね得点の 60%**です。";
  const { line } = fixLine(src);
  assert.ok(line.includes("60%**"), `数値と単位が分断されている: ${line}`);
  assertRenders(line);
});

test("入れ子・多重デリミタの行は勝手に組み替えない", () => {
  // ****強調** の形。ペアリングが一意でないので約物移動の対象外
  const src = "2. ****手持ち式**ブレーカを用いた作業は該当しない ❌**";
  const { line } = fixLine(src);
  // 少なくとも文言（アスタリスクを除いた可視テキスト）は保存されること
  assert.equal(
    line.split("**").join("").replace(/\s+/g, ""),
    src.split("**").join("").replace(/\s+/g, ""),
    `可視テキストが変化している: ${line}`
  );
});

test("回帰: 外へ出せるものが無い行で空回りせず、修正件数を水増ししない", () => {
  // 直前が開き括弧で move が空になる形。以前はここで applied=true のまま
  // ループし続け、修正件数が実変更行数(16)に対し 475 と嘘をついていた
  const src = "説明は**（注記**を参照";
  const { line, fixed } = fixLine(src);
  if (line === src) {
    assert.equal(fixed, 0, "変更していないのに修正件数が増えている");
  } else {
    assert.ok(fixed > 0);
  }
});

test("回帰: 変更が無い行は fixed=0 を返す（件数と実変更の一致）", () => {
  const src = "これは**普通の強調**です。";
  const { line, fixed } = fixLine(src);
  assert.equal(line, src);
  assert.equal(fixed, 0);
});

test("正常に描画される太字は壊さない", () => {
  for (const src of [
    "サンプラーを **30 cm 貫入**させるのに要する打撃回数",
    "**（輸送の把握）**",
    "「**翌日**」ではなく「**当日**」に測定する",
    "- **固定原価**：現場事務所費用など",
  ]) {
    const { line } = fixLine(src);
    assert.equal(line, src, `無変更であるべき行が変更された: ${src}`);
    assertRenders(line);
  }
});

test("renderStats: 崩れた太字を literal として数え、成立した太字を strong として数える", () => {
  const broken = renderStats("軸は**「お金の運用か」**の一点である。");
  assert.ok(broken.literal > 0, "崩れた太字が検出できていない");

  const ok = renderStats("これは**強調**です。");
  assert.equal(ok.literal, 0);
  assert.equal(ok.strong, 1);
});
