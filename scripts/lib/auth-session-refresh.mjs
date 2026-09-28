/**
 * auth-session-refresh.mjs の判定部（純関数）。ブラウザ・キーチェーン・ファイルには触れない。
 *
 * 仕組みは stats47 の `.claude/scripts/measurement/refresh-session.mjs` を doboku-note の認証基盤
 * （OS 標準 auth root・account assert・暗号化 state の export）へ移したもの。ログイン画面の
 * セレクタは stats47 の実測値をそのまま使う。
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * OS の資格情報ストア（Mac キーチェーン / Windows 資格情報マネージャー）で自動ログインできるサービス。
 * - shared: stats47 と共用する口座。stats47 が毎日保存する state を先に取り込み、doboku-note からの
 *   ログインは state が切れているときだけにする（同じ口座へ両方から毎日ログインしない）。キーチェーンも
 *   stats47 の項目を代わりに使ってよい。
 * - shared でないサービスは doboku-note 専用の項目だけを使う（別口座の資格情報で入らない）。
 */
export const AUTO_LOGIN = Object.freeze({
  a8: {
    shared: true,
    loginUrl: 'https://www.a8.net/',
    user: 'form[name=asLogin] input[name=login]',
    password: 'form[name=asLogin] input[name=passwd]',
    submit: 'form[name=asLogin] input[name=login_as_btn]',
    loggedIn: (url) => /media-console\.a8\.net/.test(url) && !/re-authentication|\/login/i.test(url),
  },
  moshimo: {
    shared: true,
    loginUrl: 'https://af.moshimo.com/af/shop/login',
    user: '#login-form input[name=account]',
    password: '#login-form input[name=password]',
    submit: '#login-form input[name=login]',
    loggedIn: (url) => /af\.moshimo\.com\/af\//.test(url) && !/\/login|signin/i.test(url),
  },
  kdp: {
    shared: false,
    loginUrl: 'https://kdp.amazon.co.jp/ja_JP/bookshelf',
    user: 'input[name=email]',
    next: 'input#continue',
    password: 'input[name=password]',
    remember: 'input[name=rememberMe]',
    submit: 'input#signInSubmit',
    // Amazon は headless を bot とみなして CAPTCHA を出しやすい（stats47 実測）
    headed: true,
    loggedIn: (url) => /kdp(reports)?\.amazon\.co\.jp\//.test(url) && !/\/ap\/(signin|mfa|cvf)/.test(url),
    challengeUrl: /\/ap\/(mfa|cvf)|\/errors\/validateCaptcha/,
  },
  // note・ココナラは doboku-note 専用口座。セレクタは 2026-09-28 にログイン画面の DOM で確認した。
  // ログイン成否の最終判定は statusAuthService（口座名の本文一致 assert）が行う。
  note: {
    shared: false,
    loginUrl: 'https://note.com/login',
    user: 'input[name=login]',
    password: 'input[name=password]',
    submit: 'button[type=submit]',
    loggedIn: (url) => /^https:\/\/(editor\.)?note\.com\//.test(url) && !/\/login|\/signup/.test(url),
  },
  coconala: {
    shared: false,
    loginUrl: 'https://coconala.com/login',
    user: '#UserLoginEmail',
    password: '#UserLoginPassword',
    remember: '#loginEmailSave',
    submit: 'form[action*="/login"] button[type=submit]',
    loggedIn: (url) => /^https:\/\/coconala\.com\//.test(url) && !/\/login|\/signup/.test(url),
  },
});

export const KEYCHAIN_PREFIX = 'doboku-note-auth-';
export const SHARED_KEYCHAIN_PREFIX = 'stats47-measurement-';

/** 探す資格情報の項目名（優先順）。Mac・Windows とも同じ名前。 */
export function keychainServiceNames(service) {
  const spec = AUTO_LOGIN[service];
  if (!spec) return [];
  return spec.shared ? [`${KEYCHAIN_PREFIX}${service}`, `${SHARED_KEYCHAIN_PREFIX}${service}`] : [`${KEYCHAIN_PREFIX}${service}`];
}

/** stats47 と共用する state の置き場（stats47 側の `.local/playwright-*-state.json` の symlink 先）。 */
export function sharedStatePath(service, env = process.env, home = homedir()) {
  if (!AUTO_LOGIN[service]?.shared) return null;
  const dir = env.DOBOKU_SHARED_ASP_SESSIONS || join(home, '.local', 'share', 'asp-sessions');
  return join(dir, `${service}-state.json`);
}

// 後方互換: テストと既存の呼び出し元のため credential-store から再輸出する。
export { parseKeychainAccount } from './credential-store.mjs';

/** ログイン送信後の画面を ok / human_required / login_failed に分ける。 */
export function classifyLoginOutcome(service, { url, hasPassword, hasChallenge }) {
  const spec = AUTO_LOGIN[service];
  if (spec.loggedIn(url ?? '') && !hasPassword) return 'ok';
  if (hasChallenge || spec.challengeUrl?.test(url ?? '')) return 'human_required';
  return 'login_failed';
}

/**
 * 共用 state を取り込むか。共用側が新しいときだけ上書きする（doboku-note 側で後から取った state を
 * 古い共用 state で潰さない）。cookie が 1 件も無い共用 state は取り込まない。
 */
export function decideSharedImport({ sharedMtimeMs, localMtimeMs, sharedCookieCount }) {
  if (!Number.isFinite(sharedMtimeMs)) return { import: false, reason: 'shared-missing' };
  if (!(sharedCookieCount > 0)) return { import: false, reason: 'shared-empty' };
  if (Number.isFinite(localMtimeMs) && localMtimeMs >= sharedMtimeMs) return { import: false, reason: 'local-newer' };
  return { import: true, reason: 'shared-newer' };
}

function cronFieldMatches(field, value) {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) return value >= Number(range[1]) && value <= Number(range[2]);
    return /^\d+$/.test(part) && Number(part) === value;
  });
}

/**
 * GitHub Actions の cron（UTC・5 フィールド・数値/カンマ/範囲/`*` のみ）が now から windowHours 以内に
 * 発火するか。Mac の定期実行から「この後の定期収集」を前倒しで起動するかの判定に使う。
 * 解釈できない書式は false（前倒ししない＝従来どおり定期実行に任せる）。
 */
export function cronFiresWithin(cron, now, windowHours = 24) {
  const fields = String(cron ?? '').trim().split(/\s+/);
  if (fields.length !== 5 || fields.some((f) => !/^(\*|\d+(-\d+)?(,\d+(-\d+)?)*)$/.test(f))) return false;
  const [min, hour, dom, month, dow] = fields;
  const start = Math.ceil(now.getTime() / 60000) * 60000;
  for (let t = start; t <= now.getTime() + windowHours * 3600000; t += 60000) {
    const d = new Date(t);
    if (
      cronFieldMatches(min, d.getUTCMinutes()) &&
      cronFieldMatches(hour, d.getUTCHours()) &&
      cronFieldMatches(dom, d.getUTCDate()) &&
      cronFieldMatches(month, d.getUTCMonth() + 1) &&
      cronFieldMatches(dow, d.getUTCDay())
    ) return true;
  }
  return false;
}
