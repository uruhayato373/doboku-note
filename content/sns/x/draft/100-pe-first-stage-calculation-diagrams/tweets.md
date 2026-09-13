# 教材から展開した図解

画像再生成: node scripts/render-x-figure-drafts.mjs --draft 100-pe-first-stage-calculation-diagrams

公開前に元記事の本番反映を確認する。

## Tweet 01: 【技術士第一次試験】射影を内積で検算する

<!-- 画像: img/tweet-01-vector-projection.png -->

射影の係数と、射影ベクトルの長さは別です。係数に方向ベクトルを掛けて射影を求め、元のベクトルから引いた残りと直交するかを内積で検算します。方向ベクトルは零ベクトルにしません。

https://doboku-note.com/exam/pe-first-stage/guide/matrix-vector-calculation?utm_source=x&utm_medium=social&utm_campaign=textbook-diagrams-20260913&utm_content=figure-vector-projection
#技術士 #技術士第一次試験

## Tweet 02: 【技術士第一次試験】接線の交点で更新する

<!-- 画像: img/tweet-02-newton-tangent.png -->

ニュートン法は、接線と横軸の交点を次の近似値にする計算法。繰り返しただけで収束したとはいえません。導関数が0でないか、元の式へ代入した残差が小さいかを確認します。

https://doboku-note.com/exam/pe-first-stage/guide/calculus-numerical-calculation?utm_source=x&utm_medium=social&utm_campaign=textbook-diagrams-20260913&utm_content=figure-newton-tangent
#技術士 #技術士第一次試験

## Tweet 03: 【技術士第一次試験】同電位なら中央枝は0 A

<!-- 画像: img/tweet-03-balanced-bridge.png -->

図の回路では上下の中点がともに6 Vなので、中央の抵抗を流れる電流は0 A。各2 Ωの上下2経路は、それぞれ4 Ωの並列で、合成抵抗は2 Ωです。抵抗値や接続点が変われば再計算します。

https://doboku-note.com/exam/pe-first-stage/guide/resistance-circuit-calculation?utm_source=x&utm_medium=social&utm_campaign=textbook-diagrams-20260913&utm_content=figure-balanced-bridge
#技術士 #技術士第一次試験
