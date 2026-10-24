/**
 * auth-ci-wiring.mjs — 「CI はログインしない」の配線検査の純関数（DN-0817）。
 *
 * ログインを要る取得・投稿は運営者の Mac（土曜の収集 weekly-collect と運営者の端末）だけで行う。
 * check-playwright-auth-wiring.mjs がこの関数で、
 *   (a) registry の collectors / writers の実在と、collectors に write 系の名前が無いこと
 *   (b) .github の yml が、ログインの道具を一切持たないこと
 * を見る。ファイルの読み込みは呼び出し側（ここは文字列と配列だけを受ける）。
 */
import { looksLikeWriteScript } from './playwright-auth-profile.mjs';
import { escapeRegExp } from './regexp-escape.mjs';

/** workflow に書いてあってはいけない文字列（ログインの道具）。 */
export const FORBIDDEN_WORKFLOW_PATTERNS = Object.freeze([
  { re: /DOBOKU_AUTH_/, label: 'DOBOKU_AUTH_（ログイン用の環境変数・Secrets）' },
  { re: /restore-auth-state/, label: 'restore-auth-state（暗号化 state の復元 action）' },
  { re: /playwright-auth\.mjs\s+ci-/, label: 'playwright-auth.mjs ci-*（CI のログイン復元）' },
]);

/**
 * registry の collectors / writers を検査する（実在・collectors の名前）。
 * @param {Record<string, { collectors?: string[], writers?: string[] }>} services
 * @param {(path: string) => boolean} exists repo 相対パスの実在判定
 * @returns {{ findings: string[], scriptsChecked: number, servicesChecked: number }}
 */
export function checkAuthScriptLists(services, exists) {
  const findings = [];
  let scriptsChecked = 0;
  const entries = Object.entries(services ?? {});
  for (const [id, entry] of entries) {
    const collectors = Array.isArray(entry?.collectors) ? entry.collectors : null;
    const writers = Array.isArray(entry?.writers) ? entry.writers : null;
    if (!collectors) findings.push(`service "${id}": collectors が無い`);
    if (!writers) findings.push(`service "${id}": writers が無い`);
    for (const script of [...(collectors ?? []), ...(writers ?? [])]) {
      scriptsChecked += 1;
      if (!exists(script)) findings.push(`service "${id}": script が存在しない（${script}）`);
    }
    for (const script of collectors ?? []) {
      if (looksLikeWriteScript(script)) findings.push(`service "${id}": collectors に write 系動詞のファイル名が混入（${script}）。書き込む script は writers へ`);
    }
  }
  return { findings, scriptsChecked, servicesChecked: entries.length };
}

/**
 * package.json の scripts のうち、collectors / writers の script を呼ぶものの名前
 * （workflow が `npm run <名前>` で login script を起動する抜け道を塞ぐ）。
 * @param {Record<string, string>} pkgScripts
 * @param {string[]} loginScripts repo 相対パス
 */
export function npmScriptsInvokingLogin(pkgScripts, loginScripts) {
  const names = [];
  for (const [name, cmd] of Object.entries(pkgScripts ?? {})) {
    if (loginScripts.some((s) => String(cmd).includes(s))) names.push(name);
  }
  return names;
}

/**
 * 1 つの workflow（yml）の本文を検査する。
 * @param {string} text 本文
 * @param {string} relPath 報告に出すパス
 * @param {{ loginScripts: string[], npmNames?: string[] }} ctx
 * @returns {string[]} `パス:行 理由`
 */
export function scanWorkflowForLogin(text, relPath, { loginScripts, npmNames = [] }) {
  const findings = [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const npmRuns = npmNames.map((n) => ({ n, re: new RegExp(`\\bnpm\\s+run\\s+(?:-s\\s+|--silent\\s+)?${escapeRegExp(n)}(?=\\s|$|["'])`) }));
  lines.forEach((line, i) => {
    const at = `${relPath}:${i + 1}`;
    for (const { re, label } of FORBIDDEN_WORKFLOW_PATTERNS) {
      if (re.test(line)) findings.push(`${at} ${label}`);
    }
    // 説明文（YAML のコメント行・echo で issue 本文などに書く案内）は実行ではないので、script の起動としては数えない
    if (/^\s*(-\s+)?(run:\s+)?(#|echo\b)/.test(line)) return;
    for (const script of loginScripts) {
      if (line.includes(script)) findings.push(`${at} ログインを要る script を起動（${script}）。CI はログインしない`);
    }
    for (const { n, re } of npmRuns) {
      if (re.test(line)) findings.push(`${at} ログインを要る script を起動（npm run ${n}）。CI はログインしない`);
    }
  });
  return findings;
}
