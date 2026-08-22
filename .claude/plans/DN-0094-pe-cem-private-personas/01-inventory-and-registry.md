---
taskId: DN-0094
phase: inventory
deleteAfterCompletion: true
---

# Phase 1：現物棚卸しとペルソナレジストリ

## 1. 着手前の排他確認

```bash
git branch --show-current
git status --short --branch
find .claude/plans/repository-information-architecture -type f -print 2>/dev/null
```

`repository-information-architecture`が残っている、または移行先と旧パスに同じ資産がある場合は着手しない。移行完了後、次の候補を実体で解決する。

```text
NOTE_ROOT     = content/note または docs/note の一方
STRATEGY_ROOT = 移行後の戦略SSOTルート
KNOWLEDGE_ROOT = .claude/knowledge または移行後に確定したルート
```

## 2. 既存14商品の棚卸し

次を相互照合し、14商品についてproductId、タイトル、原稿ディレクトリ、noteUrl、価格、公開状態、記事数、販売数を1行にまとめる。

- `src/lib/note-magazines.ts`
- `{NOTE_ROOT}/技術士総監/`配下の原稿と`note掲載文.txt`
- note公開APIまたは既存の`verify-note-magazines`
- `.claude/state/sales/sales-log.json`
- 現行のペルソナ選択UIと`magazine-placement`

14件にならない、原稿とカタログが1対1でない、ライブ値とSSOTが違う場合は先にドリフトを解消する。新商品で欠陥を増幅しない。

## 3. 単一レジストリの新設

実装時のコード配置規約に従い、例として`src/lib/cem-personas.ts`相当の機械可読レジストリを1つ設ける。最終パスは移行後の既存設計を優先し、類似レジストリがあれば統合する。

最低限のスキーマ:

```ts
type CemPersona = {
  id: string;
  productId: string;
  status: 'existing' | 'planned' | 'draft' | 'qa' | 'published';
  organizationFamily: 'municipality' | 'consultant' | 'contractor';
  discipline: string;
  role: string;
  authorityBoundary: string[];
  stakeholders: string[];
  projectArchetypes: [string, string];
  primaryTradeoffs: string[];
  prohibitedClaims: string[];
  primarySources: { title: string; url: string }[];
  articleRoot?: string;
  magazineId?: string;
};
```

`note-magazines.ts`へ業務定義を重複させない。商品表示情報は既存カタログ、ペルソナの意味と制作状態は本レジストリに分ける。両者は`productId`で結ぶ。

## 4. ペルソナ dossier

新規36件ごとに、原稿生成前に次を確定する。

1. 組織系統と役職。
2. できる意思決定、できない意思決定。
3. 主要ステークホルダー。
4. 過去問全年度で使い分ける2つの業務・プロジェクト類型。
5. 主軸となる5管理の対立と、残余リスク。
6. 兄弟ペルソナとの差分3点。
7. 一人称で書いてはいけない経験・実績。
8. 業務実態を裏付ける一次資料。

少なくとも3項目で既存または兄弟ペルソナとの差分を説明できなければ、独立商品にせず最近傍ペルソナへマッピングする。その判断はレジストリに`aliasOf`等で残し、「考えられたが黙って消えた」状態を作らない。

## 5. 商品ID規約

既存IDを変更しない。新規IDは次の形式を基本とし、既存カタログの命名規約に合わせて確定する。

```text
essay-{discipline}-consultant-magazine
essay-{discipline}-contractor-magazine
```

略称は一意でなければならない。`water`と`sewage`、`steel-concrete`と`road`、`machinery`と`electrical-electronics`を混同しない。

## 6. Phase 1完了条件

- [ ] 現行14商品のローカル・ライブ・売上の一覧が一致する。
- [ ] 50件すべてがレジストリに存在し、既存14／新規36が機械的に数えられる。
- [ ] 新規36件のdossierが完成し、一次資料が空でない。
- [ ] `productId`の重複がない。
- [ ] 既存カタログとレジストリの参照整合を検査するテストまたはスクリプトがある。
- [ ] 全件で独立商品にする根拠、またはalias判断が記録されている。

Phase 1が未完了なら原稿を一括生成しない。
