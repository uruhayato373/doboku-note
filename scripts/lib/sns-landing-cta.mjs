import ts from 'typescript';

// note 導線を静的に描く部品と、導線になるのに要る属性。部品は import 先のファイル名で見分ける。
//   NoteImageCta: 完成画像の CTA
//   QuizNoteProducts: 過去問演習の下の商品カード（src/app/tools/kakomon-quiz/QuizNoteProducts.tsx・サーバー部品で NoteImageCta か <a data-cta="note"> を描く）
const STATIC_NOTE_CTA_COMPONENTS = [
  { module: /^@\/components\/ui\/NoteImageCta\/NoteImageCta$/, required: ['href', 'trackLabel', 'placement'] },
  { module: /(^|\/)QuizNoteProducts$/, required: ['products', 'placement'] },
];

/** toolsのサーバーページ内のnoteリンクを判定する。コメントやclient-onlyは数えない。 */
export function hasStaticToolNoteCta(source) {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.statements.some(s => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === 'use client')) return false;
  const requiredByName = new Map();
  for (const s of file.statements) {
    if (!ts.isImportDeclaration(s) || !ts.isStringLiteral(s.moduleSpecifier)) continue;
    const kind = STATIC_NOTE_CTA_COMPONENTS.find(c => c.module.test(s.moduleSpecifier.text));
    const name = s.importClause?.name?.text;
    if (kind && name) requiredByName.set(name, kind.required);
  }
  let found = false;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const attr = name => attrs.find(a => a.name.getText(file) === name);
      const tag = node.tagName.getText(file);
      if (tag === 'a' && attr('data-cta')?.initializer?.text === 'note') found = true;
      if (requiredByName.get(tag)?.every(name => attr(name)?.initializer)) found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}
