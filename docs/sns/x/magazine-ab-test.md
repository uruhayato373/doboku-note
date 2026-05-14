# マガジンCTA A/Bテスト記録

対象マガジン: https://note.com/dobokunote/m/m607bf095b02a  
（技術士 総監｜5管理 テキスト精読ガイド ¥1,980）

## 運用方法

`/social-post x question {slug} {num} --magazine` または  
`/social-post x keyword {slug} --magazine` 実行時に使うCTAテキストをバリアントごとに差し替える。

`SKILL.md` の `--magazine` フォーマット内の以下の行を変更する:
```
5管理の論点まとめ → https://note.com/dobokunote/m/m607bf095b02a
```

UTM の `utm_content` にバリアントIDを付与して識別する:
```
https://note.com/dobokunote/m/m607bf095b02a?utm_source=x&utm_medium=organic&utm_content=cta-a
```

## CTAバリアント一覧

| ID | CTAテキスト | UTM content | 開始日 | 終了日 | note販売数 |
|---|---|---|---|---|---|
| A | 5管理の論点まとめ → {URL} | cta-a | | | |
| B | 択一対策ガイド（¥1,980）→ {URL} | cta-b | | | |
| C | 試験前に整理したい方へ → {URL} | cta-c | | | |

## 判定基準

- 1バリアントあたり2週間運用
- 評価指標: note 販売数（主）
- 順番: A → B → C の順で試す（最初は最もニュートラルな A から）

## 結果メモ

（運用後に追記）
