/** Web表示用の投影。原文Markdownを読む経路とは分け、配布・検索には全文textを渡す。 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type StandardPresentation = {
  markdown: string;
  text: string;
  tables: Array<{ key: string; id: string; pages: string; ok: boolean; reason: string; sourceText: string }>;
};

export function readStandardPresentation(
  documentRoot: string,
  chapter: { presentationFile?: string },
): StandardPresentation | null {
  return chapter.presentationFile
    ? JSON.parse(readFileSync(join(documentRoot, chapter.presentationFile), 'utf8')) as StandardPresentation
    : null;
}
