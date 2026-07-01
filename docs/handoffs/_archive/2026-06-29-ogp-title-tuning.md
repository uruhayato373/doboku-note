# ハンドオフ: OGP タイトル改行の per-page チューニング

> [!info] 目的
> ダーク OGP の**タイトル改行・主題/サブタイトルを 1 ページずつ手作りで仕上げる**。別 PC でじっくり作業する前提。
> 仕組み（`ogp.title` / `ogp.subtitle`）は実装・デプロイ済みなので、**作業は frontmatter 編集＋プレビュー＋コミットのみ**（コード変更不要）。

作成: 2026-06-29 / 対象: `.local/r2/posts/**/article.mdx` の frontmatter / 真実源: [docs/reference/ogp-prompts.md](../reference/ogp-prompts.md)

## いまの状態（前提）

- サイト OGP は**ダーク既定・新レイアウト**（資格名 kicker＋主題（大）＋サブタイトル（小）＋左下ドメイン）で本番デプロイ済み。
- タイトルは自動で「資格名除去＋区切り分割」される（`deriveTitleParts`）が、**過去問など事務的な長文は自動では完璧にならない**。そこを手動で詰めるのが本タスク。
- **per-page 手動制御は実装済み**（`ogp-create.mjs`）。`frontmatter.ogp.title` を置くと完全手動モードになる。

## やり方（1 ページの手順）

1. 対象記事の frontmatter に `ogp` ブロックを足す:

   ```yaml
   ogp:
     title: "河川、砂防及び\n海岸・海洋"      # 主題。\n が改行位置
     subtitle: "令和6年度 選択科目 過去問"   # サブ（小フォント）。省略可
   ```

   > [!warning] YAML の `\n` は**ダブルクォート必須**
   > `"...\n..."`（ダブルクォート）でないと改行として解釈されない。シングルクォート `'...\n...'` や無クォートは literal な `\n` 文字列になり改行されない。

   > [!note] 主題に資格名は入れない
   > 資格名は kicker が自動表示する。`ogp.title` には主題だけを書く（重複防止）。フォントは横幅に自動フィット（最大 88px）。サブが収まるなら自動で 1 行。

2. プレビュー生成（その 1 枚だけ）:

   ```bash
   # 破壊的（本番パスの ogp.png を更新。コミット対象）
   npm run ogp -- <fullSlug> --force
   # 例: npm run ogp -- pe-construction-r06-river-coast --force

   # 非破壊（.tmp に出して確認だけ。本番 ogp.png は触らない）
   npm run ogp -- <fullSlug> --out-dir .tmp/preview --force
   ```

   - `<fullSlug>` = `{category}/{localSlug}` をハイフン連結したもの。例: `.local/r2/posts/pe-construction/r06-river-coast/` → `pe-construction-r06-river-coast`。
   - 生成された `ogp.png` を画像ビューアで確認（VS Code でプレビュー可）。

3. 改行が気に入るまで `ogp.title` の `\n` を調整 → 再生成。

4. 確定したら **frontmatter と ogp.png を一緒にコミット**（`git add <article.mdx> <ogp.png>`）。

## まとめて確認・反映

```bash
npm run ogp-gallery -- --open     # 全 OGP を 1 枚の HTML で一覧（改行崩れの一括チェック）
npm run check-ogp-coverage        # published 全件に OGP があるかのゲート
```

- バッチが一区切りしたら `/deploy`（develop→main→Cloudflare→R2 同期）。タイミングは任意。
- `--light`（旧ライト配色）と note カバーには影響しない。ダークのみ手動制御が効く。

## 優先候補（主題が 3 行以上に折れる = 手作り推奨）

2026-06-29 時点で **81 件**。パターン別の代表:

- **過去問（最多）**: `pe-construction-r0X-*`（`令和X年度 選択科目（0904 河川…）問題` 型）。主題を科目名だけ（例 `河川、砂防及び\n海岸・海洋`）にし、`subtitle: "令和X年度 過去問"` が定石。
- **論文キーワード**: `pe-construction-road-ronbun-keyword` / `…-urban-planning-ronbun-keyword` 等（`道路（技術士 建設部門 選択科目）論文のキーワード…`）。括弧内の資格名が残るので主題を `道路 論文の頻出テーマ` 等に。
- **長い説明系**: `pe-comprehensive-management-keyword-2026` / `…-management-tradeoffs` / `civil-construction-1-guide-salary-by-role` など。

最新の候補一覧は次で再生成（チューニングが進むと減る）:

```bash
node .tmp/title-audit.mjs   # 下記スクリプト。3行以上の主題を持つ published ページを列挙
```

<details>
<summary>title-audit.mjs（候補抽出スクリプト・.tmp に置いて実行）</summary>

```js
import fs from 'fs'; import path from 'path'; import matter from 'gray-matter';
import { wrapTitle } from '#lib/sns-common/jp-text-wrap.mjs';
const cfg = JSON.parse(fs.readFileSync('.claude/config/ogp/text.json','utf8'));
const cats = JSON.parse(fs.readFileSync('src/config/categories.json','utf8'));
const G={guide:'ガイド','past-exam':'過去問',primary:'過去問',secondary:'過去問',textbook:'テキスト',keyword:'キーワード',pillar:'まとめ'};
const n=s=>String(s).replace(/[\s　（）()・、。,.\-—–｜|:：]/g,'');
function parts(raw,ex,ty){const nL=n(ex),nT=ty?n(ty):'';
  let s=String(raw).split(/\s*[｜|]\s*|\s+[—–]\s+/).map(x=>x.trim()).filter(Boolean);
  const st=g=>{const p=g.split(/\s+/).filter(Boolean);let i=0;while(i<p.length){const w=n(p[i]);if(!w){i++;continue;}if((nL&&nL.includes(w))||(nT&&w===nT)){i++;continue;}break;}return p.slice(i).join(' ');};
  s=s.map(st).filter(x=>x&&n(x)!==nL); if(!s.length)s=[String(raw)]; return s[0];}
const P='.local/r2/posts', rows=[];
for(const rel of fs.readdirSync(P,{recursive:true}).map(String).filter(p=>p.endsWith('.mdx'))){
  const {data}=matter(fs.readFileSync(path.join(P,rel),'utf8'));
  if(!data.published||data.ogp?.skip||data.ogp?.title) continue;
  const ex=cats.find(c=>c.slug===data.category)?.label||'';
  const m=parts(data.title||'',ex,G[data.group]);
  const ls=await wrapTitle(m,{...cfg,breakAt:[]});
  if(ls.length>=3) rows.push({n:ls.length,slug:rel.replace(/\/article\.mdx$/,'').replace(/\.mdx$/,'').replace(/\//,'-'),m});
}
rows.sort((a,b)=>b.n-a.n);
console.log(`候補 ${rows.length} 件\n`);
rows.forEach(r=>console.log(`${r.n}行  ${r.slug}\n      ${r.m}`));
```
</details>

## 動作確認済みの例（参考・未適用）

`pe-construction-r06-river-coast` に下記を当てると、主題「河川、砂防及び／海岸・海洋」（2 行）＋サブ「令和6年度 選択科目 過去問」で意図通り出ることを確認済み（テスト後に revert）。

```yaml
ogp:
  title: "河川、砂防及び\n海岸・海洋"
  subtitle: "令和6年度 選択科目 過去問"
```

## 仕組みの所在（コードを触る必要は無いが参考）

- 分岐: `.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs`（`data.ogp?.title` 有→完全手動 `EXPLICIT_WRAP`、無→`deriveTitleParts` 自動）。
- 描画: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderMonoTagDark`。
- 仕様 SSOT: [docs/reference/ogp-prompts.md](../reference/ogp-prompts.md)「2 軸識別」「フォントサイズと改行」節。

> [!note] 完了後
> 全候補を詰め終え deploy したら、本ハンドオフは backlog へ残作業を出して `_archive` 退避（handoff ライフサイクル）。
