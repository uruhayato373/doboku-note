#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SSOT_PATH = join(ROOT, ".claude/config/exam-calendar.json");
const calendar = JSON.parse(readFileSync(SSOT_PATH, "utf8"));

const expected = {
  "civil-construction-1": {
    first: "2026-07-05",
    second: "2026-10-04",
    source: "https://www.jctc.jp/exam/doboku-1/",
  },
  "civil-construction-2": {
    firstEarly: "2026-06-07",
    firstLate: "2026-10-25",
    second: "2026-10-25",
    source: "https://www.jctc.jp/exam/doboku-2/",
  },
  "pe-comprehensive-management": {
    applicationDeadline: "2026-04-15",
    written: "2026-07-19",
    writtenSelective: "2026-07-20",
    source: "https://www.engineer.or.jp/c_topics/011/011422.html",
  },
  "pe-construction": {
    applicationDeadline: "2026-04-15",
    written: "2026-07-20",
    source: "https://www.engineer.or.jp/c_topics/011/011422.html",
  },
  "concrete-chief-engineer": {
    applicationOpen: "2026-07-01",
    applicationDeadline: "2026-09-01",
    exam: "2026-11-30",
    source: "https://www.jci-net.or.jp/j/exam/gishi/index.html",
  },
  "concrete-diagnostician": {
    applicationOpen: "2026-04-15",
    applicationDeadline: "2026-05-21",
    exam: "2026-07-26",
    source: "https://www.jci-net.or.jp/j/exam/shindan/",
  },
};

const errors = [];
/** 実検査した件数（メッセージに literal を書かない＝検査ゼロを PASS と呼ばないため） */
const inspected = [];
for (const [examId, contract] of Object.entries(expected)) {
  const exam = calendar.exams?.[examId];
  if (!exam) {
    errors.push(`SSOTに ${examId} がありません`);
    continue;
  }
  if (exam.source !== contract.source) {
    errors.push(`${examId}.source が公式URLと一致しません`);
  }
  let n = 0;
  for (const [eventId, date] of Object.entries(contract)) {
    if (eventId === "source") continue;
    n++;
    if (exam.events?.[eventId]?.date !== date) {
      errors.push(`${examId}.${eventId}.date は ${date} である必要があります`);
    }
  }
  inspected.push({ examId, label: exam.label ?? examId, n });
}
// SSOT にあるのに contract が無い資格は「検査していない」＝素通りするので明示的に落とす
for (const examId of Object.keys(calendar.exams ?? {})) {
  if (!expected[examId]) {
    errors.push(
      `${examId} は SSOT にあるが本スクリプトの expected に無い（無検査で素通りする）`,
    );
  }
}

const scanRoots = [
  "content/sns/x/draft",
  "docs/strategy",
  "docs/editorial",
  "docs/marketing",
  "docs/operations",
  "docs/products",
  "content/note/1級・2級土木",
  ".claude/agents",
  ".claude/skills",
  "src/config",
  "src/lib",
  "content/site/concrete-chief-engineer",
  "content/site/concrete-diagnostician",
];
const textExtensions = new Set([".md", ".mdx", ".json", ".ts", ".mjs"]);
/**
 * 判定前に取り除く「実体としてのパス／ファイル名」。
 * 実在するディレクトリ名は誤記チェックの対象にしてはいけない——が、**実体が消えたら
 * 除外も消す**こと。2026-08-13 に content/note/コンクリート主任技師/ を「主任技士」へ
 * リネームしたのに除外だけ残り、docs/strategy/README.md の
 * 「旧名を指す壊れリンク」を静かに検査対象から外していた（除外がバグを覆い隠した）。
 * 除外を足すときは、その実体が消えたときに気づける形にする（下の存在検査）。
 */
const PATH_LITERALS = [
  /コンクリート主任技師20/g, // content/sources/textbook/コンクリート主任技師2022|2024（ローカル PDF 名・実在）
];
// 除外の前提（実体が在ること）が崩れたら落とす。除外は「実在するから誤記でない」という
// 主張なので、実在しなくなった瞬間に除外自体が誤りになる。
const PATH_LITERAL_ROOTS = [
  { glob: "content/sources/textbook", startsWith: "コンクリート主任技師20", why: "content/sources/textbook/コンクリート主任技師20xx" },
];
const forbidden = [
  { pattern: /2026-10-27/g, reason: "2級後期・第二次は2026-10-25" },
  { pattern: /10月27日/g, reason: "2級後期・第二次は10月25日" },
  { pattern: /10\/4-10\/27/g, reason: "土木第二次は1級10/4・2級10/25" },
  {
    pattern: /主任技師/g,
    reason:
      "公式名称は「コンクリート主任技士」（技師ではない）。2026-08-12 に 46 ファイル 163 箇所を是正した誤記の再発",
    stripPathLiterals: true,
  },
  {
    pattern: /コンクリート主任技士[^\n]{0,12}10月/g,
    reason: "コンクリート主任技士の試験は11/30（申込締切9/01）。10月ではない",
  },
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_archive")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

let scannedFiles = 0;
for (const scanRoot of scanRoots) {
  const absoluteRoot = join(ROOT, scanRoot);
  if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) continue;
  for (const file of walk(absoluteRoot)) {
    const raw = readFileSync(file, "utf8");
    let stripped = null;
    scannedFiles++;
    for (const rule of forbidden) {
      let content = raw;
      if (rule.stripPathLiterals) {
        if (stripped === null) {
          stripped = PATH_LITERALS.reduce((acc, re) => acc.replace(re, ""), raw);
        }
        content = stripped;
      }
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(content)) {
        errors.push(`${relative(ROOT, file)}: ${rule.reason}`);
      }
    }
  }
}
if (scannedFiles === 0) {
  errors.push("走査対象が 0 ファイル（検査不成立。scanRoots を確認）");
}

// PATH_LITERALS の除外は「実在するディレクトリ名だから誤記ではない」という主張。
// その実体が消えたら除外は誤りになり、旧名を指す壊れリンクを覆い隠す（2026-08-13 実発生）。
for (const root of PATH_LITERAL_ROOTS) {
  const dir = join(ROOT, root.glob);
  const exists =
    existsSync(dir) &&
    readdirSync(dir, { withFileTypes: true }).some(
      (e) => e.isDirectory() && e.name.startsWith(root.startsWith),
    );
  if (!exists) {
    errors.push(
      `PATH_LITERALS の除外が古い: ${root.why} は実在しない。除外を消すか、実体に合わせて更新すること`,
    );
  }
}

if (errors.length) {
  console.error("[check-exam-calendar] NG");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const totalEvents = inspected.reduce((a, x) => a + x.n, 0);
console.log(
  `[check-exam-calendar] OK: ${calendar.verifiedAt}確認済み — ` +
    `資格 ${inspected.length} 件 / 日付 ${totalEvents} 件を実照合、` +
    `${scannedFiles} ファイルを走査（禁止パターン ${forbidden.length} 種）`,
);
for (const x of inspected) console.log(`  ${x.label}: ${x.n} 件`);
