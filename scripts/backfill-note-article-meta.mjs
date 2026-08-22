#!/usr/bin/env node
/**
 * note 公開マガジンの収録記事 URL を、content/note/**\/magazines/ 配下の article.md
 * frontmatter（noteUrl / noteId / notePublishedAt / price）に backfill する。
 *
 * - note 公開 API（creators/{name}/contents?kind=magazine ＋ magazines/{key}/notes）から
 *   全マガジンの収録記事を取得し、記事タイトルを NFKC 正規化してソース article.md の
 *   H1 見出しと突合。
 * - **空フィールドのみ埋める（冪等）**。既に /n/ URL が入っている記事は触らない。
 * - 既定は dry-run（書き込みなし）。`--apply` で書き込み。
 * - 対象は `/magazines/` 配下の article.md のみ（年度・テーマ構造で確実に突合できる分）。
 *   公開されていない下書きマガジンの記事は note 側に存在しないため自然に「未突合」になる。
 *
 * 使い方:
 *   node scripts/backfill-note-article-meta.mjs            # dry-run
 *   node scripts/backfill-note-article-meta.mjs --apply    # 書き込み
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const CREATOR = "dobokunote";

function curlJson(url) {
  const raw = execFileSync("curl", ["-s", "--ssl-no-revoke", url], {
    encoding: "utf8",
    maxBuffer: 1e8,
  });
  return JSON.parse(raw);
}

function fetchMagazines() {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const j = curlJson(
      `https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${page}`,
    );
    const c = j?.data?.contents || [];
    out.push(...c);
    if (j?.data?.isLastPage || c.length === 0) break;
  }
  return out;
}

function fetchNotes(key) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const j = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${page}`);
    const a = j?.data?.notes || [];
    out.push(...a);
    if (j?.data?.isLastPage || a.length === 0) break;
  }
  return out;
}

// タイトル正規化: NFKC（全角→半角等）＋ 空白除去＋ チルダ/ダッシュ統一
const norm = (s) =>
  (s || "")
    .normalize("NFKC")
    .replace(/[〜～]/g, "~")
    .replace(/[‐-‒–—―ー−]/g, "-")
    .replace(/\s+/g, "")
    .trim();

// 末尾の括弧（…）を除いた語幹（loose 照合用）。例外マーカー ①②③ は語幹末尾に温存する。
const looseKey = (s) => {
  const n = norm(s); // NFKC 済（全角→半角、①→1 等）。末尾 (…) を除去
  return n.replace(/\([^()]*\)$/, "");
};

// 1) note 側インデックス構築（正規化タイトル → 記事メタ）。loose 索引も併設。
const index = new Map();
const dup = new Set();
const looseIndex = new Map();
const looseDup = new Set();
for (const m of fetchMagazines()) {
  for (const n of fetchNotes(m.key)) {
    const k = norm(n.name);
    const e = {
      id: n.key,
      url: `https://note.com/${CREATOR}/n/${n.key}`,
      date: (n.publish_at || "").slice(0, 10),
      price: n.price,
      raw: n.name,
    };
    if (index.has(k) && index.get(k).id !== n.key) dup.add(k);
    index.set(k, e);
    const lk = looseKey(n.name);
    if (looseIndex.has(lk) && looseIndex.get(lk).id !== n.key) looseDup.add(lk);
    looseIndex.set(lk, e);
  }
}

// 2) ソース article.md（magazines 配下のみ）を走査
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "article.md") {
      const np = p.replace(/\\/g, "/"); // Windows のパス区切りを正規化（/magazines/ 判定と表示用）
      if (np.includes("/magazines/")) files.push(np);
    }
  }
})("content/note");

const plan = [];
const unmatched = [];
let already = 0;
let nonEmpty = 0;
for (const f of files) {
  const t = readFileSync(f, "utf8");
  const title = (t.match(/^#\s+(.+?)\s*$/m) || [])[1] || "";
  const cur = ((t.match(/^noteUrl:\s*(.*)$/m) || [])[1] || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (cur.includes("/n/")) {
    already++;
    continue;
  }
  if (cur !== "") {
    nonEmpty++;
    continue;
  } // 空でない別値は触らない
  let hit = index.get(norm(title));
  let via = "exact";
  if (!hit) {
    // loose 照合: 末尾括弧を除いた語幹が note 側で一意なときのみ採用（①②等の語幹衝突は除外）
    const lk = looseKey(title);
    if (looseIndex.has(lk) && !looseDup.has(lk)) {
      hit = looseIndex.get(lk);
      via = "loose";
    }
  }
  if (!hit) {
    unmatched.push(`${f.replace("content/note/", "")}  «${title}»`);
    continue;
  }
  plan.push({ f, title, hit, ambiguous: dup.has(norm(title)), via });
}

console.log(
  `magazine article.md: ${files.length} / 既記入: ${already} / 非空(別値): ${nonEmpty} / 突合(空→埋め): ${plan.length} / 未突合: ${unmatched.length}`,
);
const amb = plan.filter((p) => p.ambiguous);
if (amb.length) console.log(`⚠ 同名note記事で曖昧: ${amb.length} 件（要目視）`);

console.log("\n--- 埋める予定 ---");
for (const p of plan.slice(0, 60)) {
  console.log(
    `  ${p.f.replace("content/note/", "")}${p.via === "loose" ? "  [loose]" : ""}${p.ambiguous ? "  [曖昧]" : ""}\n      → ${p.hit.raw}\n      → ${p.hit.url}  (${p.hit.date}, ¥${p.hit.price})`,
  );
}
if (plan.length > 60) console.log(`  ... 他 ${plan.length - 60} 件`);

if (unmatched.length) {
  console.log("\n--- 未突合（note未公開=下書き or タイトル不一致）---");
  unmatched.slice(0, 40).forEach((u) => console.log("  " + u));
  if (unmatched.length > 40) console.log(`  ... 他 ${unmatched.length - 40} 件`);
}

if (APPLY) {
  let wrote = 0;
  for (const { f, hit } of plan) {
    let t = readFileSync(f, "utf8");
    t = t
      .replace(/^noteUrl:\s*("")?\s*$/m, `noteUrl: ${hit.url}`)
      .replace(/^noteId:\s*("")?\s*$/m, `noteId: ${hit.id}`)
      .replace(/^notePublishedAt:\s*("")?\s*$/m, `notePublishedAt: ${hit.date}`)
      .replace(/^price:\s*(""|0)\s*$/m, `price: ${hit.price}`);
    writeFileSync(f, t);
    wrote++;
  }
  console.log(`\n✅ applied: ${wrote} files`);
} else {
  console.log("\n(dry-run。書き込むには --apply)");
}
