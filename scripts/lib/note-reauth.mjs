/**
 * note-reauth.mjs — note の売上ページで出る「パスワードの確認」を、登録済みの資格情報で 1 回だけ通す。
 *
 * note は購入者一覧・売上管理を開くと端末ごとにパスワード再確認を求める（ログイン済みでも出る）。
 * これを人が毎回通していたため、月次の売上取得が止まっていた（2026-10-01 月次レビュー）。
 * 資格情報は scripts/lib/credential-store.mjs の readServiceCredential だけから読む
 * （Mac キーチェーン / Windows 資格情報マネージャー / CI は GitHub Secrets）。
 *
 * 守ること:
 *   - パスワードをログ・引数・ファイルへ出さない（戻り値にも入れない）
 *   - 試すのは 1 回だけ。通らなければ失敗印（auth root の metadata/note.reauth-failed）を残し、
 *     人が確認して印を消すまで手元では再試行しない（アカウントロック回避）
 *   - 再確認以外の画面（ログイン画面・CAPTCHA など）には入力しない
 *
 * 画面の作り（2026-10-01 /sitesettings/purchasers → /dashboard/sales で確認）:
 *   見出し「パスワードの確認」・input[type=password]（name/id なし）・submit「確認して続ける」（入力まで disabled）
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { agentSession, readServiceCredential } from './credential-store.mjs';
import { resolveMetadataPath } from './playwright-auth-profile.mjs';

export const NOTE_REAUTH = Object.freeze({
  heading: 'パスワードの確認',
  password: 'input[type=password]',
  submit: 'button[type=submit]',
  submitText: '確認して続ける',
});

/** 失敗印の置き場（auth root の metadata/note.reauth-failed）。 */
export function noteReauthMarkPath(options) {
  return join(dirname(resolveMetadataPath('note', options)), 'note.reauth-failed');
}

/** 本文と URL から再確認画面かを判定する（純関数）。ログイン画面は対象外。 */
export function looksLikeNoteReauth({ url = '', text = '', hasPasswordInput = false }) {
  if (!hasPasswordInput) return false;
  if (/note\.com\/login/.test(url)) return false;
  return String(text).includes(NOTE_REAUTH.heading);
}

export async function isNoteReauthPage(page) {
  const [text, count] = await Promise.all([
    page.evaluate(() => document.body?.innerText || ''),
    page.locator(NOTE_REAUTH.password).count(),
  ]);
  return looksLikeNoteReauth({ url: page.url(), text, hasPasswordInput: count > 0 });
}

/**
 * 再確認画面なら資格情報で通す。
 * 戻り値 status: not_needed / ok / no_credential / blocked（失敗印あり）/ failed（印を書いた）
 */
export async function passNoteReauth(page, {
  markPath,
  readCredential = () => readServiceCredential('note'),
  isAgent = () => agentSession(),
  waitMs = 15000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  if (!(await isNoteReauthPage(page))) return { status: 'not_needed' };
  if (markPath && existsSync(markPath)) return { status: 'blocked', markPath };
  if (isAgent()) return { status: 'agent_skipped' };
  const cred = readCredential();
  if (!cred) return { status: 'no_credential' };

  await page.locator(NOTE_REAUTH.password).first().fill(cred.password);
  const submit = page.locator(NOTE_REAUTH.submit).filter({ hasText: NOTE_REAUTH.submitText }).first();
  await submit.click({ timeout: 10000 });

  for (let waited = 0; waited < waitMs; waited += 1000) {
    await sleep(1000);
    if (!(await isNoteReauthPage(page))) return { status: 'ok', source: cred.source };
  }
  if (markPath) {
    mkdirSync(dirname(markPath), { recursive: true });
    writeFileSync(markPath, `${new Date().toISOString()} note のパスワード再確認が通らなかった。資格情報を確かめてからこのファイルを消す\n`);
  }
  return { status: 'failed', markPath };
}

/** 失敗時に人へ出す 1 行（パスワードは含まない）。 */
export function describeReauthResult(result) {
  switch (result.status) {
    case 'no_credential':
      return '資格情報が未登録（Mac: security add-generic-password -s doboku-note-auth-note -a <ログインID> -w ／ Windows: cmdkey /generic:doboku-note-auth-note /user:<ログインID> /pass ／ CI: Secrets DOBOKU_AUTH_NOTE_USER・DOBOKU_AUTH_NOTE_PASSWORD）';
    case 'agent_skipped':
      return 'エージェント（Claude Code）からの実行では資格情報で再確認を通さない。オーナーが同じコマンドを実行する';
    case 'blocked':
      return `前回の自動再確認が失敗したまま（${result.markPath}）。資格情報を確かめてから印を消す`;
    case 'failed':
      return `自動再確認が通らなかった。失敗印 ${result.markPath ?? '（なし）'} を残した。資格情報を確かめてから印を消す`;
    default:
      return result.status;
  }
}
