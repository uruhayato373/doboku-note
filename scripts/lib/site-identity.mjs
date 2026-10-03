/**
 * site-identity.mjs — スクリプト・管理画面・.claude/scripts が使うサイトとアカウントの識別子。
 *
 * サイトの origin・note のクリエイター・Search Console のプロパティ・R2 の公開ホストは、サイト本体と共有する
 * `src/config/site-identity.mjs`（唯一の定義）をそのまま再公開する。X・Instagram のハンドルは
 * config/x-account.json・config/ig-account.json が正本なので、ここで読んで公開する（コードに写さない）。
 *
 * 読めない・空のときは import の時点で落とす。ハンドルが空のまま動くと、別のアカウントを操作したり
 * 「自分の投稿を除く」判定が効かなくなったりするため（2026-08-13: x-repost の ownHandle が凍結アカウントのままだった）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { REPO_ROOT } from './repository-paths.mjs';

export {
  GSC_PROPERTY,
  NOTE_BASE,
  NOTE_CREATOR,
  R2_PUBLIC_HOST,
  R2_PUBLIC_ORIGIN,
  SITE_HOST,
  SITE_ORIGIN,
} from '../../src/config/site-identity.mjs';

function readAccount(id, keys) {
  const file = join(REPO_ROOT, datasetPath(id));
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  for (const key of keys) {
    if (typeof cfg[key] !== 'string' || !cfg[key]) {
      throw new Error(`site-identity: ${id} の ${key} が空（${file}）。アカウントを特定できないので止める`);
    }
  }
  return cfg;
}

const x = readAccount('config.x-account', ['handle', 'profileUrl']);
const ig = readAccount('config.ig-account', ['handle']);

/** X（運用アカウント）のハンドル（@ なし）とプロフィール URL */
export const X_HANDLE = x.handle;
export const X_PROFILE_URL = x.profileUrl;

/** Instagram（運用アカウント）のハンドル（@ なし） */
export const IG_HANDLE = ig.handle;
