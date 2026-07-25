#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
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
};

const errors = [];
for (const [examId, contract] of Object.entries(expected)) {
  const exam = calendar.exams?.[examId];
  if (!exam) {
    errors.push(`SSOTに ${examId} がありません`);
    continue;
  }
  if (exam.source !== contract.source) {
    errors.push(`${examId}.source が公式URLと一致しません`);
  }
  for (const [eventId, date] of Object.entries(contract)) {
    if (eventId === "source") continue;
    if (exam.events?.[eventId]?.date !== date) {
      errors.push(`${examId}.${eventId}.date は ${date} である必要があります`);
    }
  }
}

const scanRoots = [
  "docs/sns/x/draft",
  "docs/project",
  "docs/note/1級・2級土木",
  ".claude/agents",
  ".claude/skills",
];
const textExtensions = new Set([".md", ".mdx", ".json", ".ts", ".mjs"]);
const forbidden = [
  { pattern: /2026-10-27/g, reason: "2級後期・第二次は2026-10-25" },
  { pattern: /10月27日/g, reason: "2級後期・第二次は10月25日" },
  { pattern: /10\/4-10\/27/g, reason: "土木第二次は1級10/4・2級10/25" },
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

for (const scanRoot of scanRoots) {
  const absoluteRoot = join(ROOT, scanRoot);
  if (!statSync(absoluteRoot).isDirectory()) continue;
  for (const file of walk(absoluteRoot)) {
    const content = readFileSync(file, "utf8");
    for (const rule of forbidden) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(content)) {
        errors.push(`${relative(ROOT, file)}: ${rule.reason}`);
      }
    }
  }
}

if (errors.length) {
  console.error("[check-exam-calendar] NG");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `[check-exam-calendar] OK: ${calendar.verifiedAt}確認済み（1級2件・2級3件）`,
);
