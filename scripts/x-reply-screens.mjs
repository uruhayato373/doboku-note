#!/usr/bin/env node
/**
 * x-reply-screens.mjs
 *
 * X の返信候補を内蔵ブラウザで読むための道具。読む画面（config/x-reply-trial.json の xScreens と、話題ごとの X の検索）を
 * 一覧し、画面で実行する取り出しのスクリプトを出し、返った結果を .tmp/x-outreach/x-posts/ に保存する。
 * 保存した分は npm run x-reply-candidates が Yahoo の検索と合わせて判定する。読むだけで、送信はしない。
 *
 * Usage:
 *   npm run x-reply-screens -- --list                   # 読む画面（id・URL・スクロール回数）
 *   npm run x-reply-screens -- --js <id>                # その画面の javascript_tool に渡すスクリプト
 *   npm run x-reply-screens -- --save <id> < result.json  # スクリプトの返り値（JSON）を保存する
 *
 * npm run x-reply-screens — X の返信候補を内蔵ブラウザで読む画面（xScreens＝フォロー中・おすすめ、xSearch＝話題ごとの検索（最新））を --list で出し、--js <id> で javascript_tool に渡す取り出しのスクリプトを出し、返り値を --save <id> の標準入力で .tmp/x-outreach/x-posts/ に保存する。読んだ投稿 0 件は exit 1（ログイン切れ・構造の変化）。読むだけ・投稿用アカウントの Playwright プロファイルは使わない（x-post-policy §11.7）
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseXPosts } from './lib/x-reply-candidates.mjs';
import { buildExtractorJs, xScreens } from './lib/x-reply-screens.mjs';

const flags = parseCliArgs({ list: { type: 'boolean' }, js: { type: 'string' }, save: { type: 'string' } });
const config = readDataset(REPO_ROOT, 'config.x-reply-trial');
const screens = xScreens(config);
const OUT_DIR = path.join(REPO_ROOT, '.tmp', 'x-outreach', 'x-posts');

const find = (id) => {
  const screen = screens.find((s) => s.id === id);
  if (!screen) {
    console.error(`画面 ${id} はありません（${screens.map((s) => s.id).join('・')}）`);
    process.exitCode = 2;
  }
  return screen;
};

if (flags.list) {
  for (const s of screens) console.log(`${s.id}\t${s.url}${s.tab ? `（タブ「${s.tab}」）` : ''}\tスクロール ${s.scrolls} 回\t${s.label}`);
} else if (flags.js) {
  const screen = find(flags.js);
  if (screen) console.log(buildExtractorJs(screen, config));
} else if (flags.save) {
  const screen = find(flags.save);
  if (screen) {
    let result;
    try {
      result = JSON.parse(fs.readFileSync(0, 'utf8'));
      if (typeof result === 'string') result = JSON.parse(result); // javascript_tool は JSON の文字列を返す
    } catch {
      console.error('標準入力が JSON として読めません（スクリプトの返り値をそのまま渡す）');
      process.exitCode = 2;
    }
    if (result?.error) {
      console.error(`画面で失敗: ${result.error}`);
      process.exitCode = 1;
    } else if (result) {
      const { posts, invalid } = parseXPosts(result.kept);
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      const file = path.join(OUT_DIR, `${screen.id}-${stamp}.json`);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(result.kept, null, 2)}\n`);
      // 読んだ数と残した数を分けて出す（読めずに 0 件なのか、資格の投稿が無かったのかを区別する）
      console.log(`${screen.id}: 読んだ投稿 ${result.read ?? '?'} 件・資格の語を含む ${posts.length} 件を保存${invalid ? `（形の合わない ${invalid} 件を捨てた）` : ''} → ${path.relative(REPO_ROOT, file)}`);
      if (!result.read) {
        console.error('投稿を 1 件も読めていません（ログイン切れ・画面の構造の変化を確かめる）');
        process.exitCode = 1;
      }
    }
  }
} else {
  console.error('使い方: npm run x-reply-screens -- --list | --js <id> | --save <id> < result.json');
  process.exitCode = 2;
}
