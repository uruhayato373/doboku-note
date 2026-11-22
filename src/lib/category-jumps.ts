import { getCategoryBySlug } from '@/lib/categories';

// ジャンプの項目は categories.json の layout.jumps が持つ（DN-0793）
export function getCategoryJumps(category: string) {
  return [...(getCategoryBySlug(category)?.layout?.jumps ?? [])].sort((a, b) => Number(!/primary|pastExam/.test(a.href)) - Number(!/primary|pastExam/.test(b.href)));
}
