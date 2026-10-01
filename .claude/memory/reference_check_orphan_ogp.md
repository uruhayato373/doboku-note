---
name: check-orphan-ogp
description: 記事MDX無しの孤児ogp.png/webpを検知する機械ガード check-orphan-ogp（--fix付）。r2-auditにCI配線済
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8c5fb26b-8a0f-4830-9dd0-a5e0361619d1
---

孤児 OGP（記事 MDX が無いのに `ogp.png`/`ogp.webp` が git に残る死に資産）の機械検知は `npm run check-orphan-ogp`。`check-ogp-coverage`（記事あるがOGP無し）の逆方向。

- 実体: `scripts/check-orphan-ogp.mjs`。孤児判定は二重シグナル（①同ディレクトリに `.mdx` 同居 or ②いずれかの記事 slug の resolveOgpPath がそのディレクトリを指す）→ Convention A/B で誤検知なし。published:true/false 不問（下書きでも記事があれば正当）。
- `--fix` で孤児 OGP 削除＋空ディレクトリ掃除。`--json` あり。
- CI: `.github/workflows/r2-audit.yml`（週次 cron）に `check-ogp-coverage` の直後へ backstop 配線。pre-commit には入れていない（coverage と同じく CI-only）。
- 発端: 2026-07 に孤児掃除を試みた際、`reference-materials/{slug}/ogp.png` を「MDX無し孤児」と手動判定して削除したが**これは誤り**だった。記事は兄弟dir `reference-materials-{slug}/article.mdx`（ハイフン区切り Convention A・published:false 下書き）に実在し、OGP は `reference-materials/{slug}/ogp.png` に解決される。手動調査で `reference-materials/{slug}/` 内だけ MDX を探し兄弟dirを見落とした。→全OGP再生成(1dad48d25)で復元。
- 教訓: **check-orphan-ogp（機械）はこのケースを誤検知しない**（signal2＝resolveOgpDir が兄弟dirの slug を正しく `reference-materials/{slug}` に解決）。手動 grep より二重シグナルの機械判定が堅牢。OGP出力先dir≠記事MDX格納dir があり得る（Convention A のハイフン命名）ことに注意。[[project_content_resurrection]]
