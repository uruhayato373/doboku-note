/**
 * affiliate-slot-creatives.ts — 「この面にこの案件を出す」と決まったとき、面のサイズの決まりに合う画像バナーを返す（ビルド時＝SSG）。
 *
 * サイズの決まりは config/cta-placements.json の sizes（PC・スマホ別・先頭ほど優先）、素材は data/affiliate/catalog.json の creatives。
 * 選び方は依存ゼロの affiliate-creative-pick.mjs（テストと共有）。どの面にどの案件を出すかは affiliate-placement.ts が決める。
 */
import catalogJson from '../../data/affiliate/catalog.json';
import ctaPlacements from '../../config/cta-placements.json';
import { pickSlotCreatives } from './affiliate-creative-pick.mjs';
import type { SidebarAdCreative } from '@/config/affiliate-creatives';

type Creative = {
  asp: string;
  materialId: string;
  kind: string;
  width?: number;
  height?: number;
  href: string;
  imageSrc?: string;
  pixelSrc?: string;
  avoid?: string;
};
type CatalogProgram = { label: string; creatives?: Creative[] };
type SlotSizes = { pc: string[]; mobile: string[] };

const PROGRAMS = (catalogJson as unknown as { programs: Record<string, CatalogProgram> }).programs;
const VOCAB = ctaPlacements.affiliate as Record<string, { sizes?: SlotSizes }>;

export type SlotCreative = SidebarAdCreative & { readonly asp: string; readonly materialId: string };
export type SlotCreatives = { readonly pc: SlotCreative | null; readonly mobile: SlotCreative | null };

function toBanner(program: string, c: Creative | null): SlotCreative | null {
  if (!c || !c.imageSrc || !c.width || !c.height) return null;
  return {
    asp: c.asp,
    materialId: c.materialId,
    href: c.href,
    imageSrc: c.imageSrc,
    pixelSrc: c.pixelSrc ?? '',
    alt: PROGRAMS[program]?.label ?? program,
    width: c.width,
    height: c.height,
  };
}

/** 面のサイズの決まりがある面だけ。決まりが無い面・合う素材が無い案件は pc・mobile とも null */
export function slotCreatives(program: string, slot: string): SlotCreatives {
  const sizes = VOCAB[slot]?.sizes;
  if (!sizes) return { pc: null, mobile: null };
  const picked = pickSlotCreatives(PROGRAMS[program]?.creatives, sizes) as { pc: Creative | null; mobile: Creative | null };
  return { pc: toBanner(program, picked.pc), mobile: toBanner(program, picked.mobile) };
}

