#!/usr/bin/env node
/** 手作業で Codex へ渡す生成指示の部品を出す。  npm run image-rules -- --exam <資格> --format shorts|longform */
import { parseArgs } from 'node:util';
import { examPalette, loadImageRules } from './lib/image-rules.mjs';

const { values: args } = parseArgs({ options: { exam: { type: 'string' }, format: { type: 'string', default: 'shorts' } } });
const rules = loadImageRules();
const format = rules.formats[args.format];
if (!args.exam || !format) { console.error('使い方: npm run image-rules -- --exam <資格> --format shorts|longform'); process.exit(2); }
console.log([format.frame, `${rules.popStyle}資格の色は${examPalette(args.exam)}。`, rules.teacher.identity, rules.teacher.body, rules.textRule].join('\n'));
