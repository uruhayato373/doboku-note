/**
 * voicevox-credit.mjs — VOICEVOX の話者 → 利用条件のクレジット表記（「VOICEVOX:キャラクター名」）。
 * 話者ごとの条件はエンジンの speaker_info で確かめる（2026-10-08 に話者 13 を確認）。概要欄の生成と素材の来歴が使う。
 */
export const VOICEVOX_CREDIT = { 13: '青山龍星' };

/** 話者のクレジット（`VOICEVOX:青山龍星`）。未定義の話者は投げる（表記漏れのまま公開しない） */
export function voicevoxCredit(speaker) {
  const name = VOICEVOX_CREDIT[speaker];
  if (!name) throw new Error(`VOICEVOX 話者 ${speaker} のクレジットが未定義（scripts/lib/voicevox-credit.mjs に足す）`);
  return `VOICEVOX:${name}`;
}
