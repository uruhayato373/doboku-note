#!/usr/bin/env node
/** Fixed-profile carousel route diagrams and captions. Covers are ImageGen assets supplied separately. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const ROOT = REPO_ROOT;
const base = 'content/sns/instagram/profile-pinned';
const manifest = readDataset(ROOT, 'config.instagram-pinned');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function diagram(post) {
  const color = post.accent;
  const choices = post.choices.map((choice, i) => {
    const y = 350 + i * 102;
    return `<rect x="92" y="${y}" width="896" height="78" rx="20" fill="#FFFFFF" stroke="${color}" stroke-width="3"/><text x="540" y="${y + 52}" text-anchor="middle" class="choice">${esc(choice)}</text>`;
  }).join('\n');
  const stepsStart = post.choices.length === 3 ? 745 : 665;
  const steps = post.steps.map((step, i) => {
    const y = stepsStart + i * 128;
    return `<rect x="92" y="${y}" width="896" height="90" rx="25" fill="${i === 2 ? color : '#FFFFFF'}" stroke="${color}" stroke-width="3"/><circle cx="150" cy="${y + 45}" r="27" fill="${i === 2 ? '#FFFFFF' : color}"/><text x="150" y="${y + 55}" text-anchor="middle" class="num" fill="${i === 2 ? color : '#FFFFFF'}">${i + 1}</text><text x="540" y="${y + 58}" text-anchor="middle" class="step" fill="${i === 2 ? '#FFFFFF' : '#15283A'}">${esc(step)}</text>${i < 2 ? `<path d="M540 ${y + 94} v26" stroke="${color}" stroke-width="5" stroke-linecap="round"/><path d="m526 ${y + 112} 14 15 14 -15" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>` : ''}`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><style>text{font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif}.title{font-size:58px;font-weight:800;fill:#15283A}.subtitle{font-size:29px;font-weight:600;fill:#34485C}.label{font-size:30px;font-weight:700;fill:${color}}.choice{font-size:35px;font-weight:700;fill:#15283A}.step{font-size:36px;font-weight:700}.num{font-size:30px;font-weight:800}.foot{font-size:26px;font-weight:600;fill:#526679}</style><rect width="1080" height="1350" fill="#F7F9FC"/><rect width="1080" height="20" fill="${color}"/><text x="92" y="115" class="label">保存版｜学習の入口</text><text x="92" y="205" class="title">${esc(post.title)}</text><text x="92" y="263" class="subtitle">${esc(post.subtitle)}</text><text x="92" y="325" class="label">対象を選ぶ</text>${choices}<text x="92" y="${stepsStart - 42}" class="label">次の3ステップ</text>${steps}<text x="540" y="1285" text-anchor="middle" class="foot">プロフィールのリンクから資格別ページへ</text><rect x="0" y="1330" width="1080" height="20" fill="${color}"/></svg>`;
}

for (const post of manifest.posts) {
  const dir = join(ROOT, base, post.key, 'carousel');
  mkdirSync(join(dir, 'img'), { recursive: true });
  const svg = diagram(post);
  writeFileSync(join(dir, '01-route.svg'), svg);
  writeFileSync(join(dir, 'caption.txt'), post.caption + '\n');
  await sharp(Buffer.from(svg)).png().toFile(join(dir, 'img', '01-route.png'));
  console.log(`${post.key}: caption ${post.caption.length} chars, route 1080x1350`);
}
