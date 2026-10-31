#!/usr/bin/env node
import { readDataset } from './lib/dataset-io.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { checkInstagramProfileFunnel, checkInstagramPinnedPlan } from './lib/instagram-profile-funnel.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { SITE_ORIGIN } from './lib/site-identity.mjs';
import { utmChannel } from './lib/utm-contract.mjs';
import { InstagramPinnedPopImage } from './lib/dataset-schemas-content.mjs';

const account = readDataset(REPO_ROOT, 'config.ig-account');
const problems = checkInstagramProfileFunnel(account, utmChannel('instagram.bio'), SITE_ORIGIN);
const base = join(REPO_ROOT, 'content/sns/instagram/profile-pinned');
const manifest = readDataset(REPO_ROOT, 'config.instagram-pinned');
const drive = readDataset(REPO_ROOT, 'state.drive-manifest');
problems.push(...checkInstagramPinnedPlan(account, manifest));
for (const post of manifest.posts) {
  const dir = join(base, post.key);
  const cover = join(dir, 'carousel/img/00-cover.png');
  const route = join(dir, 'carousel/img/01-route.png');
  const caption = join(dir, 'carousel/caption.txt');
  const provenance = join(dir, 'pop-image.json');
  const routeSource = join(dir, 'carousel/01-route.svg');
  if (![caption, provenance, routeSource].every(existsSync)) {
    problems.push(`${post.key}: 原稿・図解ソース・来歴が不足`);
    continue;
  }
  const meta = InstagramPinnedPopImage.parse(JSON.parse(readFileSync(provenance, 'utf8')));
  const coverRel = `content/sns/instagram/profile-pinned/${post.key}/carousel/img/00-cover.png`;
  const routeRel = `content/sns/instagram/profile-pinned/${post.key}/carousel/img/01-route.png`;
  if (drive.entries?.[coverRel]?.sha256 !== meta.output?.sha256 || !drive.entries?.[routeRel]?.sha256) {
    problems.push(`${post.key}: Drive台帳に表紙・図解の現版が無い`);
  }
  if (existsSync(cover)) {
    const sha = createHash('sha256').update(readFileSync(cover)).digest('hex');
    if (sha !== meta.output?.sha256) problems.push(`${post.key}: 手元の表紙PNGと来歴のSHAが違う`);
  }
  if (existsSync(route)) {
    const sha = createHash('sha256').update(readFileSync(route)).digest('hex');
    if (sha !== drive.entries?.[routeRel]?.sha256) problems.push(`${post.key}: 手元の図解PNGとDrive台帳のSHAが違う`);
  }
  if (readFileSync(caption, 'utf8').trim() !== post.caption) problems.push(`${post.key}: キャプション原稿がマニフェストと違う`);
}
console.log(`[instagram-profile-funnel] 1プロフィール・1リンク・固定投稿${manifest.posts.length}本を検査 / 違反 ${problems.length} 件`);
for (const problem of problems) console.error(`FAIL ${problem}`);
if (problems.length) process.exit(1);
console.log('PASS');
