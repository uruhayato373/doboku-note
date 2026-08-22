'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "../ui/ThemeToggle/ThemeToggle";
import categoriesData from "@/config/categories.json";
import { CategoryDef } from "@/lib/categories";

const categories = (categoriesData as CategoryDef[]).filter(c => c.visible !== false);

// 2026-04-26 #84 LCP 改善: above-fold の Header から lucide-react を除去し inline SVG 化。
// SVG path は lucide v0.542.0（MIT、ISC は除外）の各アイコンから抽出。
// 共通属性は SvgIcon ラッパーに集約してマークアップを簡潔に保つ。
type IconProps = { className?: string };

function SvgIcon({ className, children, viewBox = "0 0 24 24" }: { className?: string | undefined; children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || "w-5 h-5"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const Search = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </SvgIcon>
);

const HardHat = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z" />
    <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    <path d="M4 15v-3a6 6 0 0 1 6-6" />
    <path d="M14 6a6 6 0 0 1 6 6v3" />
  </SvgIcon>
);

const GraduationCap = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </SvgIcon>
);

const BookOpen = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </SvgIcon>
);

const User = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </SvgIcon>
);

const Menu = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M4 12h16" />
    <path d="M4 18h16" />
    <path d="M4 6h16" />
  </SvgIcon>
);

const X = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </SvgIcon>
);

const ChevronDown = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="m6 9 6 6 6-6" />
  </SvgIcon>
);

const Layers = ({ className }: IconProps) => (
  <SvgIcon className={className}>
    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
  </SvgIcon>
);

function CategoryIcon({ variant, className }: { variant: string; className?: string }) {
  const cn = className || "w-5 h-5";
  if (variant === "civil") return <HardHat className={cn} />;
  if (variant === "reference") return <BookOpen className={cn} />;
  return <GraduationCap className={cn} />;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleCategoryDropdown = () => setIsCategoryOpen(prev => !prev);
  const closeCategoryDropdown = () => setIsCategoryOpen(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuOpen) closeMenu();
        if (isCategoryOpen) closeCategoryDropdown();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen, isCategoryOpen]);

  useEffect(() => {
    if (!isCategoryOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        closeCategoryDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  return (
    <>
      <header
        className="bg-[var(--paper)] border-b border-[var(--rule-soft)] transition-colors duration-300"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-16 sm:h-[72px]">
            <div className="flex items-center">
              <Link
                href="/"
                className="focus-ring flex items-baseline gap-2 sm:gap-3 rounded-card-inline hover:opacity-80 transition-opacity"
                aria-label="doboku-note ホーム"
              >
                <span className="font-serif text-[26px] sm:text-[32px] font-black tracking-tight leading-none text-[var(--ink)]">
                  doboku
                </span>
                <span className="font-mono text-[10px] sm:text-xs text-[var(--ink-muted)] tracking-widest uppercase">
                  — note
                </span>
              </Link>
            </div>
            {/* Mobile menu and ThemeToggle */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                href="/search"
                className="focus-ring p-2 rounded-card-inline hover:bg-[var(--accent-fill)] transition-colors"
                aria-label="検索"
              >
                <Search className="w-6 h-6 text-[var(--ink-body)]" />
              </Link>
              <button
                onClick={toggleMenu}
                className="focus-ring p-2 rounded-card-inline hover:bg-[var(--accent-fill)] transition-colors"
                aria-label="メニューを開く"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                <Menu className="w-6 h-6 text-[var(--ink-body)]" />
              </button>
              <ThemeToggle />
            </div>
            {/* Desktop navigation and ThemeToggle */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/search"
                className="focus-ring flex flex-col items-center gap-1 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2 rounded-card-inline transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="text-[11px] font-medium">検索</span>
              </Link>

              {/* 資格一覧ドロップダウン */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  onClick={toggleCategoryDropdown}
                  aria-expanded={isCategoryOpen}
                  aria-haspopup="true"
                  className="focus-ring flex flex-col items-center gap-1 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2 rounded-card-inline transition-colors"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span className="flex items-center gap-0.5 text-[11px] font-medium">
                    資格一覧
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isCategoryOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content shadow-lift z-50 overflow-hidden">
                    {categories.map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/category/${cat.slug}`}
                        onClick={closeCategoryDropdown}
                        className="focus-ring flex items-center gap-3 px-4 py-3 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] transition-colors"
                      >
                        <CategoryIcon variant={cat.variant} className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{cat.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/links"
                className="focus-ring flex flex-col items-center gap-1 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2 rounded-card-inline transition-colors"
              >
                <Layers className="w-5 h-5" />
                <span className="text-[11px] font-medium">教材</span>
              </Link>

              <Link
                href="/about"
                className="focus-ring flex flex-col items-center gap-1 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2 rounded-card-inline transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] font-medium">About</span>
              </Link>
              <div className="ml-2 pl-2 border-l border-[var(--rule-soft)]">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* オーバーレイ */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
          onTouchEnd={closeMenu}
        />
      )}

      {/* ドロワーメニュー */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[var(--paper)] shadow-lift z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4">
          {/* 閉じるボタン */}
          <button
            onClick={closeMenu}
            className="focus-ring absolute top-4 right-4 p-2 rounded-card-inline hover:bg-[var(--accent-fill)] text-[var(--ink-body)]"
            aria-label="メニューを閉じる"
          >
            <X className="w-6 h-6" />
          </button>

          {/* ナビゲーションリンク */}
          <nav className="mt-12 space-y-2">
            {/* 検索リンク */}
            <Link
              href="/search"
              onClick={closeMenu}
              className="focus-ring flex items-center gap-3 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2.5 rounded-card-inline transition-colors"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">検索</span>
            </Link>
            {/* カテゴリリンク */}
            {categories.map(cat => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                onClick={closeMenu}
                className="focus-ring flex items-center gap-3 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2.5 rounded-card-inline transition-colors"
              >
                <CategoryIcon variant={cat.variant} />
                <span className="font-medium">{cat.label}</span>
              </Link>
            ))}

            {/* 教材（/links）リンク */}
            <Link
              href="/links"
              onClick={closeMenu}
              className="focus-ring flex items-center gap-3 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2.5 rounded-card-inline transition-colors"
            >
              <Layers className="w-5 h-5" />
              <span className="font-medium">教材</span>
            </Link>

            {/* Aboutリンク */}
            <Link
              href="/about"
              onClick={closeMenu}
              className="focus-ring flex items-center gap-3 text-[var(--ink-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-fill)] px-3 py-2.5 rounded-card-inline transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">About</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
