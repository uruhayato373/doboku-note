---
taskId: DN-0584
type: implementation-plan
createdAt: 2026-10-08
deleteOnComplete: true
---

過去問の番号一覧をnative detailsに畳み、問1へ直行できるようにする。番号は44px以上、冒頭の既存商品画像はコンパクトに表示する。仕様書は発行機関・版・原本ページを表示し、原文を保った表に明暗配色と横スクロール案内を付ける。

受入条件: 代表2ページをPC/スマホ×light/darkの8条件で撮影し、横はみ出し・画像欠落・操作エラー0件。番号の開閉とジャンプ、表のキーボード操作が通る。type-check・変更範囲lint・CI build/E2Eが成功し、main経由のデプロイと本番SSR検査exit 0を確認する。EXP-019の割当や計測は保ち、UI変更日を記録する。
