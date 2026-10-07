// 永続プロファイルのダウンロード履歴が残ると、次の起動の最初のダウンロードで Chrome が落ちる（2026-10-07・A8 の週次 CI で当月が必ず落ちた）。
// 起動前に Default/History を消す。Cookie など他のファイルは残す。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearDownloadHistory } from "../scripts/lib/google-console-browser.mjs";

test("起動前に Default/History だけを消し、Cookie は残す（無くても投げない）", () => {
  const dir = mkdtempSync(join(tmpdir(), "pw-profile-"));
  mkdirSync(join(dir, "Default"));
  for (const f of ["History", "History-journal", "Cookies"]) writeFileSync(join(dir, "Default", f), "x");
  clearDownloadHistory(dir);
  assert.equal(existsSync(join(dir, "Default", "History")), false);
  assert.equal(existsSync(join(dir, "Default", "History-journal")), false);
  assert.equal(readFileSync(join(dir, "Default", "Cookies"), "utf8"), "x");
  clearDownloadHistory(dir);
  clearDownloadHistory(join(dir, "missing"));
});

test("共通の起動関数が起動前に呼ぶ", () => {
  const src = readFileSync(join("scripts", "lib", "google-console-browser.mjs"), "utf8");
  const body = src.slice(src.indexOf("export async function launchContext"));
  assert.ok(body.indexOf("clearDownloadHistory(dir)") > 0 && body.indexOf("clearDownloadHistory(dir)") < body.indexOf("launchPersistentContext"));
});
