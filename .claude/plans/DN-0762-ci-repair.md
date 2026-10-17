---
taskId: DN-0762
type: implementation-plan
createdAt: 2026-10-17
deleteOnComplete: true
---

# DN-0762 制作表記の再承認と最終検証

残るのは説明欄の共通制作表記を追加した版の最終承認。8本の修正文面は各パックの youtube.json とこのブランチの差分で確認できる。YouTube側の説明欄は変更していない。SNSの新規展開・追加予約は保留。予約・公開の日時、素材、動画IDを変更しない。

追加文面:

> 【この動画の制作について】
> 本動画は、技術士（総合技術監理部門）取得者が、実務経験と公的資料に基づいて企画・監修しています。AIはナレーション音声や映像制作の補助に限定して使用しています。解説内容の確認と最終判断は著者が行っています。

コンテンツ台帳の規約により、次のコマンドは運営者が自分の端末で実行する。AIは実行しない。変更するのはローカルの承認記録で、YouTubeへの公開・予約・同期を行うコマンドではない。

```bash
cd /Users/minamidaisuke/.codex/worktrees/civil2-cce-content-quality/doboku-note
npm run registry -- approve --pub civil-construction-2/anzen-touan-gutaika-kaitei/youtube.longform --stage final --expect b2178be4c1b9ef59ffaf9bd67931a573c8585e6e913c2fb8ef864a7eabb2bc80
npm run registry -- approve --pub civil-construction-2/anzen-touan-gutaika/youtube.longform --stage final --expect 5bcbd0065f94feb4606a166345e8836498be3a06ae854a2d0e1a891ba57b6ffa
npm run registry -- approve --pub civil-construction-2/hinshitsu-touan-gutaika/youtube.longform --stage final --expect 8220ec1c9fce973fdd4ca7baa442c12dab73d8cd2a5b501a5b6d8815eadc6912
npm run registry -- approve --pub civil-construction-2/keiken-daizai-erabi/youtube.longform --stage final --expect 0d1c82c1967f0e22d95ada8ea955230e36d61f6c83a8810996a5acc25b732da3
npm run registry -- approve --pub civil-construction-2/kento-taio-kakiwake/youtube.longform --stage final --expect 868673e7d4fd261149ff6170b7939fdbc42b8229d09a6d552dab514a90cab817
npm run registry -- approve --pub civil-construction-2/koji-gaiyo-seigou/youtube.longform --stage final --expect ae49d80355a33ecd4b89f5d8e1c27b82f02a3d2c64b95514f1f1f4672b429f8e
npm run registry -- approve --pub civil-construction-2/kotei-touan-gutaika/youtube.longform --stage final --expect 13021cccbb6880f14ef754820651c4bae3c55eee0d135634c99ec90d2bf79470
npm run registry -- approve --pub civil-construction-2/touan-teishutsu-check/youtube.longform --stage final --expect 0a96af10b8581b4af4de0f38121e2dcc53b49970b872c046d4874cc6d6e6a2e8
```

承認後に `npm run check-content-registry` と `npm run quality:audit:ci` を実行し、対象数を確認して失敗・タイムアウト・検査不成立が0になったらDN-0762を閉じる。公開済み1本と予約済み7本の説明欄の実体同期は、SNS保留範囲を確認したうえで別途実施し、未同期のまま反映済みと呼ばない。
