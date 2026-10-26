/**
 * MDX の frontmatter が `published: false`（非公開の下書き）かを判定する。
 * 過去問の下書きは公式正答の無い年度を運営者が確定する前に置くので（DN-0866）、
 * 公開面へ流れる生成物（演習データ・iOS の問題束）はこれで除く。
 */
export function isUnpublishedMdx(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return false;
  return /^published:\s*false\s*$/m.test(m[1]);
}
