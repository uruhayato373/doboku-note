import React from "react";

export interface CategoryHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  variant?: "shigodeki" | "ikeoji";
}

export default function CategoryHeader({
  title,
  subtitle,
  icon,
  variant = "shigodeki",
}: CategoryHeaderProps) {
  const isShigodeki = variant === "shigodeki";

  if (isShigodeki) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950 dark:via-gray-900 dark:to-cyan-950 rounded-3xl p-8 md:p-12 mb-16 transition-all duration-500 hover:shadow-2xl dark:hover:shadow-primary-900/20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary-400 rounded blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-24 h-24 bg-cyan-400 rounded blur-2xl"></div>
          <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-primary-300 rounded blur-2xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Icon and Title Row */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 mb-8">
            {/* Icon with Blue Theme */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary-400 dark:bg-primary-500 rounded blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary-500 to-cyan-500 w-20 h-20 md:w-24 md:h-24 rounded flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300">
                {icon}
              </div>
            </div>

            {/* Title with Blue Gradient */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-800 dark:from-primary-400 dark:via-cyan-400 dark:to-primary-300 bg-clip-text text-transparent transition-all duration-300">
              {title}
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 font-medium leading-relaxed transition-colors duration-300">
            {subtitle}
          </p>
        </div>
      </div>
    );
  }

  // ikeoji variant - シゴデキと同様の構成
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950 dark:via-gray-900 dark:to-cyan-950 rounded-3xl p-8 md:p-12 mb-16 transition-all duration-500 hover:shadow-2xl dark:hover:shadow-primary-900/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary-400 rounded blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-24 h-24 bg-cyan-400 rounded blur-2xl"></div>
        <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-primary-300 rounded blur-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Icon and Title Row */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 mb-8">
          {/* Icon with Blue Theme */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary-400 dark:bg-primary-500 rounded blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-primary-500 to-cyan-500 w-20 h-20 md:w-24 md:h-24 rounded flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300">
              {icon}
            </div>
          </div>

          {/* Title with Blue Gradient */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-800 dark:from-primary-400 dark:via-cyan-400 dark:to-primary-300 bg-clip-text text-transparent transition-all duration-300">
            {title}
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 mb-8 font-medium leading-relaxed transition-colors duration-300">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
