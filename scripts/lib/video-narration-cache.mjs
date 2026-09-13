import { createHash } from 'node:crypto';
import { applyReadingDict } from '../../.claude/scripts/lib/sns-common/reading-dict.mjs';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function narrationInput(narration, speaker) {
  const text = applyReadingDict(narration);
  return { text, inputSha256: sha256(JSON.stringify({ text, speaker })) };
}
export function reusableNarration(record, input, bytes) {
  return record?.inputSha256 === input.inputSha256 && record?.sha256 === sha256(bytes);
}
