export function parseQuestionNo(text: string): number | null {
  const m =
    text.match(/(?:問題\s*)?No\.?\s*(\d+)/i) ??
    text.match(/第\s*(\d+)\s*問/) ??
    text.match(/問\s*(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

