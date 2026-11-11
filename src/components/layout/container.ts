/**
 * 全幅の区画の中身を置くコンテナ（最大 1280px・左右の余白込み）。
 *
 * 最大幅と左右の余白は**同じ要素**に付ける。余白を外側の要素に付けて内側に max-w だけを置くと、
 * 1280px を超える画面幅で中身がほかの区画より左右 40px ずつ広くなる（2026-11-11 にトップページで発生。
 * `npm run site-visual-review` の edge が検出する）。ヘッダー・フッター・トップページの区画・SectionBlock が使う。
 */
export const WIDE_CONTAINER = 'mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10';

/**
 * 読み幅 760px の中身を置くコンテナ（左右の余白込み）。`SectionBlock width="760"`・`PageHeader width="760"` と
 * 中身の左右の端が一致する（lg 以上は余白 40px・中身 760px、sm〜lg は余白 24px）。
 *
 * ツールのページが `max-w-[760px] mx-auto px-4 sm:px-6` を手書きしていたため、lg 以上で中身が 712px になり、
 * 見出しの帯（760px）より左右 24px ずつ内側にずれていた（2026-11-11・site-visual-review の DN-1108）。
 */
export const READING_CONTAINER = 'mx-auto max-w-[808px] px-4 sm:px-6 lg:max-w-[840px] lg:px-10';
