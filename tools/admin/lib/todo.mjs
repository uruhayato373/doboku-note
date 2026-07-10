/**
 * todo.mjs — docs/todo/*.md の read-only 統合ビュー（TODO タブ・読み取り専用）。
 *
 *   todoBoard() … backlog.md（tier-first・### タスク＋タグ:行）と他 todo ファイル
 *                 （## / ### セクション単位）をカード配列へパースする。
 *
 * backlog の機械読取り契約（docs/todo/backlog.md 凡例）:
 *   - `## 🔴/🟡/🟢/🟣 …` = tier セクション
 *   - `### タスク名` = 1 タスク（カード）
 *   - 見出し直下の `タグ: [カテゴリ] [Codex候補]` 行 = 第1タグ=カテゴリ・Codex候補は任意フラグ
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const TODO_DIR = join(ROOT, "docs", "todo");

const TIER = { "🔴": "high", "🟡": "mid", "🟢": "low", "🟣": "hold" };

// mode: "backlog"=tier セクション+### タスク / "sections"=見出しレベル level で 1 カード
const FILES = [
  { id: "backlog", file: "backlog.md", label: "バックログ", mode: "backlog" },
  { id: "weekly", file: "weekly.md", label: "週間", mode: "sections", level: 2 },
  { id: "monthly", file: "monthly.md", label: "月間", mode: "sections", level: 3 },
  { id: "annual", file: "annual.md", label: "年間", mode: "sections", level: 3 },
  { id: "measurement", file: "measurement-infra-enhancement.md", label: "計測基盤", mode: "sections", level: 3 },
  { id: "codex", file: "codex-integration.md", label: "Codex方針", mode: "sections", level: 2 },
  { id: "refsites", file: "reference-sites.md", label: "参考サイト", mode: "sections", level: 2 },
];

function tierOf(text) {
  for (const [emoji, tier] of Object.entries(TIER)) if (text.includes(emoji)) return tier;
  return null;
}

// backlog: `## <絵文字> …` で tier コンテキストを張り、各 `###` をカード化。
// tier セクション以前（凡例等）の ### は無視。タグ: 行は body に含めない。
function parseBacklog(lines, f) {
  const out = [];
  let tier = null;
  let cur = null;
  const flush = () => {
    if (cur) { cur.body = cur.body.join("\n").trim(); out.push(cur); cur = null; }
  };
  lines.forEach((ln, i) => {
    if (/^###\s+/.test(ln)) {
      flush();
      if (tier) {
        cur = {
          file: f.id, fileLabel: f.label, path: "docs/todo/" + f.file, abs: join(TODO_DIR, f.file), line: i + 1,
          tier, category: "未分類", title: ln.replace(/^###\s+/, "").trim(), codex: false, body: [],
        };
      }
      return;
    }
    if (/^##\s+/.test(ln)) { flush(); tier = tierOf(ln); return; }
    if (!cur) return;
    const tag = ln.match(/^タグ:\s*(.+)/);
    if (tag && cur.body.filter((l) => l.trim()).length === 0) {
      const tokens = [...tag[1].matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
      cur.codex = tokens.includes("Codex候補");
      cur.category = tokens.find((t) => t !== "Codex候補") || "未分類";
      return;
    }
    cur.body.push(ln);
  });
  flush();
  return out;
}

// 汎用: ^#{level} 見出し = 1 カード。より深い見出しは body に残し、同じ/浅い見出しで閉じる。
function parseSections(lines, f) {
  const out = [];
  let cur = null;
  const open = new RegExp(`^#{${f.level}}\\s+(.*)`);
  const close = new RegExp(`^#{1,${f.level}}\\s+`);
  const flush = () => {
    if (cur) { cur.body = cur.body.join("\n").trim(); out.push(cur); cur = null; }
  };
  lines.forEach((ln, i) => {
    const m = ln.match(open);
    if (m) {
      flush();
      const title = m[1].trim();
      cur = {
        file: f.id, fileLabel: f.label, path: "docs/todo/" + f.file, line: i + 1,
        tier: tierOf(title), category: f.label, title, codex: false, body: [],
      };
      return;
    }
    if (cur && close.test(ln)) { flush(); return; }
    if (cur) cur.body.push(ln);
  });
  flush();
  return out;
}

export function todoBoard() {
  const items = [];
  for (const f of FILES) {
    const p = join(TODO_DIR, f.file);
    if (!existsSync(p)) continue; // 削除済み/未作成ファイルは UI 側でチップ非表示
    const lines = readFileSync(p, "utf8").split(/\r?\n/); // CRLF 耐性
    items.push(...(f.mode === "backlog" ? parseBacklog(lines, f) : parseSections(lines, f)));
  }
  const counts = { high: 0, mid: 0, low: 0, hold: 0, none: 0 };
  for (const it of items) counts[it.tier || "none"]++;
  return {
    generatedAt: new Date().toISOString(),
    files: FILES.filter((f) => existsSync(join(TODO_DIR, f.file))).map((f) => ({
      id: f.id, label: f.label, path: "docs/todo/" + f.file,
      count: items.filter((i) => i.file === f.id).length,
    })),
    counts,
    items,
  };
}
