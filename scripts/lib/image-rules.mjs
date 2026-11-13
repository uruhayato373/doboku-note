/**
 * image-rules.mjs — AI 画像の共通ルール（データセット config.image-generation）の読み口。
 * 生成指示の部品はここから組み立て、各工程へ人物・配色・安全域・禁止事項を書かない（check-image-rules が止める）。
 * 資格の色の正本は note-cover-tokens.json（exam-palette.mjs と同じ）。
 */
import { readDataset } from './dataset-io.mjs';
import { REPO_ROOT } from './repository-paths.mjs';
import { readJson } from './json-io.mjs';
import { paletteKeyOf } from './qualification-palette.mjs';

export const loadImageRules = (root = REPO_ROOT) => readDataset(root, 'config.image-generation');

/** 資格の色を生成指示の文へ。未知の資格は投げる（色を推測しない） */
export function examPalette(exam, root = REPO_ROOT) {
  const tokens = readJson(root, '.claude/knowledge/design-system/note-cover-tokens.json').exams;
  const key = paletteKeyOf(exam, root);
  const color = key ? tokens[key] : null;
  if (!color?.base) throw new Error(`資格の色が無い: ${exam}`);
  return `主色 ${color.base} と濃色 ${color.deep}`;
}

export const usesDiagramLed = (exam, root = REPO_ROOT) => loadImageRules(root).diagramLedExams.includes(exam);

const USES_CODEX = /from\s+['"][^'"]*codex-image\.mjs['"]/;
// codex-image.mjs を通さずに codex を直接起動する書き方（spawn('codex', …)・execSync('codex exec …') など・DN-1015）。
// 直接起動すると生成の入口・来歴・後片付け・起動失敗の区別（DN-0991）を素通りする。
const DIRECT_CODEX = /\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync)\s*\(\s*['"`]codex(?:\.cmd|\.exe)?(?:['"`]|\s)/;
const IDENTITY_WORDS = /黒縁眼鏡|黄白の反射帯/u;

/** コードの一覧と経路の台帳を照らす。呼び出し元の数と違反を返す */
export function routeViolations(files, read, routes, exists) {
  const entries = new Set(routes.map((route) => route.entry));
  const errors = routes.filter((route) => !exists(route.entry)).map((route) => `${route.id}: 入口が無い ${route.entry}`);
  let callers = 0;
  for (const file of files) {
    const text = read(file);
    if (USES_CODEX.test(text)) {
      callers += 1;
      if (!entries.has(file)) errors.push(`${file}: routes に無い経路が Codex を使っている`);
    }
    if (DIRECT_CODEX.test(text)) errors.push(`${file}: codex を直接起動している。scripts/lib/codex-image.mjs の関数を使う`);
    if (IDENTITY_WORDS.test(text)) errors.push(`${file}: 先生の特徴は共通ルールの設定から読む`);
  }
  return { callers, errors };
}
