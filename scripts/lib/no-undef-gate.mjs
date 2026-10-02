/**
 * no-undef-gate.mjs — scripts の未定義参照（import 漏れ・引用符の付け忘れ）を検査する決定的ゲート。
 *
 * eslint.config は scripts/ を対象外にしている（UI 用の規則が合わない）ため、未定義の参照だけをここで当てる。
 * 2026-10-02 に report-site-to-sales.mjs の readdirSync の import 漏れが書き込み経路だけで落ち（--check は通る）、
 * 同じ検査で note-sync-plan.mjs の引用符なし文字列と instagram-campaign.mjs の未定義変数が見つかった。
 *
 * グローバルは「この Node が実際に持つもの」＋ CommonJS の名前＋ Playwright の page.evaluate の中で使う
 * ブラウザの名前だけを許す（それ以外の未定義は誤り）。
 */
import { ESLint } from 'eslint';

/** 検査する範囲（リポジトリ相対の glob） */
export const TARGETS = ['scripts/**/*.{mjs,js}', '.claude/scripts/**/*.mjs', '.claude/skills/**/*.mjs'];

/** page.evaluate・addInitScript の中で動くブラウザ側のグローバル */
const BROWSER = [
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'getComputedStyle', 'getSelection',
  'innerWidth', 'innerHeight', 'scrollX', 'scrollY', 'devicePixelRatio', 'requestAnimationFrame', 'Image', 'CSS',
  'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLAnchorElement', 'HTMLImageElement', 'HTMLSelectElement',
  'Element', 'Node', 'NodeFilter', 'SVGElement', 'XMLSerializer', 'MutationObserver', 'IntersectionObserver',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'ClipboardEvent', 'DataTransfer', 'FileReader', 'File',
];
const COMMONJS = ['require', 'module', 'exports', '__dirname', '__filename'];

export function allowedGlobals() {
  const names = new Set([...Object.getOwnPropertyNames(globalThis), ...COMMONJS, ...BROWSER]);
  return Object.fromEntries([...names].map((n) => [n, 'readonly']));
}

/**
 * @param {string} cwd リポジトリのルート
 * @returns {Promise<{ files: number, problems: { file: string, line: number, message: string }[] }>}
 */
export async function findUndefined(cwd) {
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    ignore: false,
    errorOnUnmatchedPattern: false, // 件数は呼び手が見る（0 件を成功と呼ばない）
    overrideConfig: {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: allowedGlobals() },
      linterOptions: { reportUnusedDisableDirectives: 'off' },
      rules: { 'no-undef': 'error' },
    },
  });
  // *.workflow.mjs は Workflow の実行環境が関数の中で動かす（最上位の return を含む）ので対象外
  const results = (await eslint.lintFiles(TARGETS)).filter((r) => !/\.workflow\.mjs$/.test(r.filePath));
  const problems = [];
  for (const r of results) {
    for (const m of r.messages) {
      problems.push({ file: r.filePath.slice(cwd.length + 1).split('\\').join('/'), line: m.line, message: m.message });
    }
  }
  return { files: results.length, problems };
}
