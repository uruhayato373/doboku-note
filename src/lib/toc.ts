export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Generate a URL-safe ID from heading text.
 * Handles Japanese characters by keeping them as-is (browsers support Unicode fragment IDs).
 */
export function generateHeadingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'heading';
}

/**
 * Extract headings from MDX content string.
 * Skips headings inside code blocks (```) and math blocks ($$).
 */
export function extractHeadings(
  content: string,
  minLevel: number = 2,
  maxLevel: number = 4,
): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = content.split('\n');
  const usedIds = new Map<string, number>();
  let inCodeBlock = false;
  let inMathBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (trimmed === '$$') {
      inMathBlock = !inMathBlock;
      continue;
    }
    if (inCodeBlock || inMathBlock) continue;

    const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1]!.length;
    if (level < minLevel || level > maxLevel) continue;

    const text = match[2]!
      .replace(/\*\*(.+?)\*\*/g, '$1') // strip bold
      .replace(/\*(.+?)\*/g, '$1')     // strip italic
      .replace(/`(.+?)`/g, '$1')       // strip inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // strip links
      .trim();

    let id = generateHeadingId(text);
    const count = usedIds.get(id) ?? 0;
    if (count > 0) {
      id = `${id}-${count}`;
    }
    usedIds.set(generateHeadingId(text), count + 1);

    headings.push({ id, text, level });
  }

  return headings;
}
