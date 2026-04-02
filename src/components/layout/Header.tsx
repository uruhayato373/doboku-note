'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { Briefcase, Heart, User, Menu, X } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle/ThemeToggle";
import categoriesConfig from "@/config/categories.json";
import { CategoriesConfig } from "@/types/category";

const categories = categoriesConfig as CategoriesConfig;

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // ESCキーでの閉じる機能
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  // スクロールロックの実装
  /*
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);
  */
  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:scale-105 transition-all duration-200"
              >
                KAKKOMU
              </Link>
            </div>
            {/* Mobile menu and ThemeToggle */}
            <div className="flex items-center gap-2 md:hidden">
              {mounted && (
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="メニューを開く"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              )}
              <ThemeToggle />
            </div>
            {/* Desktop navigation and ThemeToggle */}
            <nav className="hidden md:flex space-x-4 items-center">
              {Object.entries(categories).map(([categoryName, config]) => {
                const IconComponent =
                  config.icon === "FaHeart" ? Heart : Briefcase;
                return (
                  <Link
                    key={categoryName}
                    href={`/category/${encodeURIComponent(categoryName)}`}
                    className="flex flex-col items-center space-y-1 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md transition-colors"
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs font-medium">{categoryName}</span>
                  </Link>
                );
              })}

              <Link
                href="/about"
                className="flex flex-col items-center space-y-1 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-xs font-medium">About</span>
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      {/* オーバーレイ */}
      {mounted && isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
          onTouchEnd={closeMenu}
        />
      )}

      {/* ドロワーメニュー */}
      {mounted && (
        <div
          className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
        <div className="p-4">
          {/* 閉じるボタン */}
          <button
            onClick={closeMenu}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="メニューを閉じる"
          >
            <X className="w-6 h-6" />
          </button>

          {/* ナビゲーションリンク */}
          <nav className="mt-12 space-y-4">
            {/* カテゴリリンク */}
            {Object.entries(categories).map(([categoryName, config]) => {
              const IconComponent = config.icon === "FaHeart" ? Heart : Briefcase;
              return (
                <Link
                  key={categoryName}
                  href={`/category/${encodeURIComponent(categoryName)}`}
                  onClick={closeMenu}
                  className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md transition-colors"
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{categoryName}</span>
                </Link>
              );
            })}

            {/* Aboutリンク */}
            <Link
              href="/about"
              onClick={closeMenu}
              className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">About</span>
            </Link>
          </nav>
        </div>
        </div>
      )}
    </>
  );
}
