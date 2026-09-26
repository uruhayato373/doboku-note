#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { FORBIDDEN, findForbidden } from "./lib/exam-calendar-guards.mjs";
import { activeIds, validateQualificationRegistry } from "./lib/qualification-registry.mjs";

const ROOT = process.cwd();
const SSOT_PATH = join(ROOT, ".claude/config/exam-calendar.json");
const calendar = JSON.parse(readFileSync(SSOT_PATH, "utf8"));

const expected = {
  "civil-construction-1": {
    applicationOpen: "2026-03-23",
    applicationDeadline: "2026-04-06",
    first: "2026-07-05",
    second: "2026-10-04",
    firstResult: "2026-08-13",
    secondResult: "2027-01-08",
    source: "https://www.jctc.jp/exam/doboku-1/",
  },
  "civil-construction-2": {
    firstEarlyApplicationOpen: "2026-03-04",
    firstEarlyApplicationDeadline: "2026-03-18",
    firstLateApplicationOpen: "2026-07-08",
    firstLateApplicationDeadline: "2026-07-22",
    firstEarly: "2026-06-07",
    firstLate: "2026-10-25",
    second: "2026-10-25",
    firstEarlyResult: "2026-07-07",
    firstLateResult: "2026-12-02",
    secondResult: "2027-02-03",
    source: "https://www.jctc.jp/exam/doboku-2/",
  },
  "pe-comprehensive-management": {
    applicationOpen: "2026-04-01",
    applicationDeadlineWeb: "2026-04-14",
    applicationDeadline: "2026-04-15",
    writtenResult: "2026-11-04",
    finalResult: "2027-03-12",
    written: "2026-07-19",
    writtenSelective: "2026-07-20",
    source: "https://www.engineer.or.jp/c_topics/011/011422.html",
  },
  "pe-construction": {
    applicationOpen: "2026-04-01",
    applicationDeadlineWeb: "2026-04-14",
    applicationDeadline: "2026-04-15",
    writtenResult: "2026-11-04",
    finalResult: "2027-03-12",
    written: "2026-07-20",
    source: "https://www.engineer.or.jp/c_topics/011/011422.html",
  },
  "pe-water-supply": {
    applicationOpen: "2026-04-01",
    applicationDeadlineWeb: "2026-04-14",
    applicationDeadline: "2026-04-15",
    writtenResult: "2026-11-04",
    finalResult: "2027-03-12",
    written: "2026-07-20",
    source: "https://www.engineer.or.jp/c_topics/011/011422.html",
  },
  "pe-first-stage": {
    applicationOpen: "2026-06-10",
    applicationDeadline: "2026-06-23",
    applicationDeadlineMail: "2026-06-24",
    exam: "2026-11-22",
    source: "https://www.engineer.or.jp/c_topics/011/011423.html",
  },
  "concrete-engineer": {
    applicationOpen: "2026-07-01",
    applicationDeadline: "2026-08-25",
    exam: "2026-11-29",
    result: "2027-01-15",
    source: "https://www.jci-net.or.jp/j/exam/gishi/chart/gs_schedule.html",
  },
  "concrete-chief-engineer": {
    applicationOpen: "2026-07-01",
    applicationDeadline: "2026-08-25",
    exam: "2026-11-29",
    result: "2027-01-15",
    source: "https://www.jci-net.or.jp/j/exam/gishi/chart/gs_schedule.html",
  },
  "concrete-diagnostician": {
    applicationOpen: "2026-04-15",
    applicationDeadline: "2026-05-21",
    exam: "2026-07-26",
    source: "https://www.jci-net.or.jp/j/exam/shindan/",
  },
  rccm: {
    applicationDeadline: "2026-06-10",
    cbtStart: "2026-09-01",
    cbtEnd: "2026-10-31",
    result: "2027-03-01",
    source: "https://www.rccm-cpd.com/rccm/rccmtop.html",
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
// periods（日付未発表の期間）は label と window の文言が必須。同じ id が events（確定日）にも
// あると「発表済みなのに期間のまま」の二重管理になるので落とす（発表されたら events へ移して消す）。
let periodCount = 0;
for (const [examId, exam] of Object.entries(calendar.exams ?? {})) {
  for (const [periodId, period] of Object.entries(exam.periods ?? {})) {
    periodCount++;
    if (typeof period?.label !== "string" || typeof period?.window !== "string" || !period.window) {
      errors.push(`${examId}.periods.${periodId} は label と window（公式の期間の文言）が必要です`);
    }
    if (exam.events?.[periodId]) {
      errors.push(`${examId}.periods.${periodId} は events にも存在します（日付が発表されたら periods から消す）`);
    }
  }
}
// 資格一覧（qualification-registry.json）・受験者統計（exam-stats.json）・出題形式（exam-formats.json）・
// 商品ラインナップと id が揃っていること。
const readConfig = (name) => JSON.parse(readFileSync(join(ROOT, ".claude/config", name), "utf8"));
const registry = readConfig("qualification-registry.json");
for (const e of validateQualificationRegistry({
  registry,
  calendar,
  examStats: readConfig("exam-stats.json"),
  formats: readConfig("exam-formats.json"),
  lineupConfig: readConfig("product-lineup.json"),
  refExists: (p) => existsSync(join(ROOT, p)),
})) {
  errors.push(e);
}
// 展開中（active）の資格は本文・商品に日付を載せるので、公式値を上の expected に二重登録して照合する。
// contract が無い active は「検査していない」＝素通りするので明示的に落とす。候補（candidate/declined）は
// 形の検査（validateQualificationRegistry）だけで、本文へ日付を載せる段階で active にして contract を足す。
for (const examId of activeIds(registry)) {
  if (!expected[examId]) {
    errors.push(
      `${examId} は registry で active だが本スクリプトの expected に無い（無検査で素通りする）`,
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
  // 2026-09-26: 年間計画（annual.md）の日付表の誤りが走査外で素通りしたため追加
  ".claude/todo",
  "src/config",
  "src/lib",
  "content/site/concrete-chief-engineer",
  "content/site/concrete-engineer",
  "content/site/concrete-diagnostician",
];
const textExtensions = new Set([".md", ".mdx", ".json", ".ts", ".mjs"]);
// 除外の前提（実体が在ること）が崩れたら落とす。除外は「実在するから誤記でない」という
// 主張なので、実在しなくなった瞬間に除外自体が誤りになる。
const PATH_LITERAL_ROOTS = [
  { glob: "content/sources/textbook", startsWith: "コンクリート主任技師20", why: "content/sources/textbook/コンクリート主任技師20xx" },
  { glob: "docs/marketing", startsWith: "09_YouTube戦略_コンクリート技士", why: "docs/marketing/09_YouTube戦略_コンクリート技士・主任技士.md" },
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
    scannedFiles++;
    for (const reason of findForbidden(readFileSync(file, "utf8"))) {
      errors.push(`${relative(ROOT, file)}: ${reason}`);
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
      (e) => (e.isDirectory() || e.isFile()) && e.name.startsWith(root.startsWith),
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
    `資格 ${inspected.length} 件 / 日付 ${totalEvents} 件を実照合・未発表の期間 ${periodCount} 件を検査、` +
    `${scannedFiles} ファイルを走査（禁止パターン ${FORBIDDEN.length} 種）`,
);
for (const x of inspected) console.log(`  ${x.label}: ${x.n} 件`);
