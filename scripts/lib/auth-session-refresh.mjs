/**
 * auth-session-refresh.mjs の判定部（純関数）。ブラウザ・キーチェーン・ファイルには触れない。
 *
 * 仕組みは stats47 の `.claude/scripts/measurement/refresh-session.mjs` を doboku-note の認証基盤
 * （OS 標準 auth root・account assert）へ移したもの。ログイン画面の
 * セレクタは stats47 の実測値をそのまま使う。
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * OS の資格情報ストア（Mac キーチェーン / Windows 資格情報マネージャー）で自動ログインできるサービス。
 * - shared: stats47 と共用する口座。stats47 が毎日保存する state を先に取り込み、doboku-note からの
 *   ログインは state が切れているときだけにする（同じ口座へ両方から毎日ログインしない）。キーチェーンも
 *   stats47 の項目を代わりに使ってよい。
 * - sharedCredential: state は共用しないが、口座は stats47 と同じなので、キーチェーンは stats47 の項目を代わりに使ってよい
 *   （afb。state を別プロセスへ持ち出せないため shared にはできない）。
 * - どちらでもないサービスは doboku-note 専用の項目だけを使う（別口座の資格情報で入らない）。
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
  // afb はログイン状態を別プロセスへ持ち出せない（sessionPersistsAcrossProcesses:false）。毎日のログイン維持では
  // 入らず、取得スクリプト（asp-browser の openAsp）が同じプロセスの中でログインする。セレクタは 2026-10-01 に
  // requiredlogin 画面の DOM で確認（login_name / password・同じ action のフォームが 2 つあるので :visible で絞る）。
  afb: {
    shared: false,
    sharedCredential: true,
    inProcessOnly: true,
    loginUrl: 'https://www.afi-b.com/pa/',
    user: 'input[name=login_name]:visible',
    password: 'input[name=password]:visible',
    submit: 'form[action*="/general/login/partner"] input[type=submit]:visible',
    loggedIn: (url) => /afi-b\.com\//.test(url) && !/requiredlogin|\/login/.test(url),
  },
  // ログイン画面は不可視の reCAPTCHA（v3・size=invisible）を常に埋め込む。2026-10-01 の headless での送信は
  // ログイン画面へ戻された（拒否の文言は未記録）ため、KDP と同じく画面ありで送る。
  coconala: {
    shared: false,
    loginUrl: 'https://coconala.com/login',
    user: '#UserLoginEmail',
    password: '#UserLoginPassword',
    remember: '#loginEmailSave',
    submit: 'form[action*="/login"] button[type=submit]',
    headed: true,
    loggedIn: (url) => /^https:\/\/coconala\.com\//.test(url) && !/\/login|\/signup/.test(url),
  },
});

export const KEYCHAIN_PREFIX = 'doboku-note-auth-';
export const SHARED_KEYCHAIN_PREFIX = 'stats47-measurement-';

/** 探す資格情報の項目名（優先順）。Mac・Windows とも同じ名前。 */
export function keychainServiceNames(service) {
  const spec = AUTO_LOGIN[service];
  if (!spec) return [];
  return spec.shared || spec.sharedCredential ? [`${KEYCHAIN_PREFIX}${service}`, `${SHARED_KEYCHAIN_PREFIX}${service}`] : [`${KEYCHAIN_PREFIX}${service}`];
}

/** stats47 と共用する state の置き場（stats47 側の `.local/playwright-*-state.json` の symlink 先）。 */
export function sharedStatePath(service, env = process.env, home = homedir()) {
  if (!AUTO_LOGIN[service]?.shared) return null;
  const dir = env.DOBOKU_SHARED_ASP_SESSIONS || join(home, '.local', 'share', 'asp-sessions');
  return join(dir, `${service}-state.json`);
}

// 後方互換: テストと既存の呼び出し元のため credential-store から再輸出する。
export { parseKeychainAccount } from './credential-store.mjs';

const CHALLENGE_TEXT = /認証コード|ワンタイム|確認コード|私はロボットではありません|画像認証|2段階認証|文字を入力してください/;

/**
 * ログイン送信後の画面に人の確認（CAPTCHA・2FA）が出ているか（純関数）。frames はページの iframe（src・見えるか）。
 * 不可視の reCAPTCHA（size=invisible の anchor。v3 の印）はログイン画面に常にあるので数えない
 * （2026-10-01 ココナラ: 送信が拒まれてログイン画面へ戻っただけで human_required と判定し、原因を隠した）。
 * 数えるのは、見えている reCAPTCHA のチェックボックス・画像の問題（bframe）・hCaptcha・Turnstile と、確認コード等の文言。
 */
export function detectChallenge({ frames = [], text = '' } = {}) {
  const challengeFrame = frames.some(({ src = '', visible }) => visible && (
    (/recaptcha/.test(src) && (/\/bframe/.test(src) || (/\/anchor/.test(src) && !/[?&]size=invisible/.test(src))))
    || /hcaptcha\.com|challenges\.cloudflare\.com|turnstile/.test(src)
  ));
  return challengeFrame || CHALLENGE_TEXT.test(text);
}

/** ログイン画面に出た文言を記録用に整える（メールアドレスは伏せる・200 字まで）。 */
export function maskLoginText(text) {
  return String(text ?? '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<メール>').replace(/\s+/g, ' ').trim().slice(0, 200);
}

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

/**
 * ログイン画面に ID/PW を入れて送信する（1 画面と、メール → 次へ → パスワードの 2 段階の両方）。
 * 呼び出し側は 1 回だけ呼ぶ（失敗しても繰り返さない）。cred をログへ出さない。
 */
export async function submitLoginForm(page, spec, cred) {
  const visible = (sel) => page.locator(sel).first().isVisible().catch(() => false);
  if (await visible(spec.user)) {
    await page.locator(spec.user).first().fill(cred.user);
    if (spec.next && await visible(spec.next)) {
      await page.locator(spec.next).first().click();
      await page.waitForSelector(spec.password, { state: 'visible', timeout: 30000 }).catch(() => {});
    }
  }
  if (!(await visible(spec.password))) return;
  await page.locator(spec.password).first().fill(cred.password);
  if (spec.remember && await visible(spec.remember)) await page.locator(spec.remember).first().check().catch(() => {});
  await page.locator(spec.submit).first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
}
