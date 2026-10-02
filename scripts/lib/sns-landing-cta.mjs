import ts from 'typescript';

/** toolsのサーバーページ内のnoteリンクを判定する。コメントやclient-onlyは数えない。 */
export function hasStaticToolNoteCta(source) {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.statements.some(s => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === 'use client')) return false;
  const imageCtaNames = new Set(file.statements
    .filter(s => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier)
      && s.moduleSpecifier.text === '@/components/ui/NoteImageCta/NoteImageCta')
    .map(s => s.importClause?.name?.text).filter(Boolean));
  let found = false;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const attr = name => attrs.find(a => a.name.getText(file) === name);
      const tag = node.tagName.getText(file);
      if (tag === 'a' && attr('data-cta')?.initializer?.text === 'note') found = true;
      if (imageCtaNames.has(tag) && ['href', 'trackLabel', 'placement'].every(name => attr(name)?.initializer)) found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}
