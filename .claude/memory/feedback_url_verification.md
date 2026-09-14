---
name: 参考資料URLの実在確認を必ず行う
description: 参考資料のURLを推測で書かず、WebSearch→WebFetchで必ず実在確認する（Wikipedia中黒問題の教訓）
type: feedback
originSessionId: 78094211-f040-49ad-80c9-7ffd409c71d1
---
参考資料のURLは推測や記憶で書かず、必ず WebSearch → WebFetch の2段階で実在確認する。

**Why:** デザインインの参考資料で「デザインイン」のWikipedia URLを推測で記載したが、正式な項目名は「デザイン・イン」（中黒あり）で404になった。Wikipedia は中黒（・）の有無、漢字/カタカナ表記ゆれで別ページになるため、検索で正確な項目名を確認してからURLを組み立てる必要がある。

**How to apply:**
1. WebSearch でキーワードを検索し、実際のURLを取得する
2. WebFetch でそのURLにアクセスし、200が返ること＋内容が関連していることを確認する
3. 確認できたURLのみ記載する
4. content-principles.md 原則12に反映済み
