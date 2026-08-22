import { transformMdxFile } from './lib/mdx-io.mjs';

const filePath = 'C:/Users/m004195/doboku-note/content/site/pe-comprehensive-management/power-harassment/article.mdx';

transformMdxFile(filePath, (raw) => {
  // 1. frontmatter に reviewStatus, lastRewrittenAt, revisionCycle を追加
  let updated = raw.replace(
    /^(---\n[\s\S]*?)(published: true)/m,
    '$1published: true\nreviewStatus: needs-review\nlastRewrittenAt: \'2026-04-17\'\nrevisionCycle: 1'
  );

  // 2. 参考資料セクションを末尾に追加（関連キーワード行の後）
  const refSection = `\n## 参考資料\n\n- [職場におけるハラスメントの防止のために（厚生労働省）](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/seisaku06/index.html) — パワハラ防止措置の概要・指針・相談窓口・啓発資料を一元公開する厚生労働省の公式ページ\n- [パワハラとは｜職場のパワハラ3要素と6類型、該当する言動（日本の人事部）](https://jinjibu.jp/keyword/detl/120/) — 3要素・6類型の定義と具体的な言動例を人事実務の視点からわかりやすく解説\n`;

  updated = updated + refSection;

  return updated;
});

console.log('Done');
