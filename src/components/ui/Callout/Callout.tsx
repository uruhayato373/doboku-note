"use client";

import { ReactNode, useMemo } from "react";
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  FileText,
  Lightbulb,
  HelpCircle
} from "lucide-react";

/**
 * Calloutコンポーネントのプロパティ定義
 */
interface CalloutProps {
  type?: "info" | "warning" | "error" | "success" | "note" | "tip" | "question" | "caution" | "danger";
  title?: string;
  children: ReactNode;
}

/**
 * Calloutコンポーネント
 *
 * 情報、警告、エラー、成功、メモ、ヒントなどの異なる種類のメッセージを
 * 視覚的に区別して表示するためのコンポーネントです。
 */
export default function Callout({
  type = "info",
  title,
  children,
}: CalloutProps) {
  // 各タイプの設定を定義（コンポーネント外に移動）
  const typeConfig = useMemo(() => ({
    info: {
      icon: Info,
      bgColor: "bg-primary-50/80 dark:bg-primary-900/80",
      borderColor: "border-primary-500 dark:border-primary-400",
      iconColor: "text-primary-600 dark:text-primary-400",
      titleColor: "text-primary-800 dark:text-primary-200",
      textColor: "text-primary-700 dark:text-primary-300",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50/80 dark:bg-yellow-900/80",
      borderColor: "border-yellow-500 dark:border-yellow-400",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      titleColor: "text-yellow-800 dark:text-yellow-200",
      textColor: "text-yellow-700 dark:text-yellow-300",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-50/80 dark:bg-red-900/80",
      borderColor: "border-red-500 dark:border-red-400",
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-800 dark:text-red-200",
      textColor: "text-red-700 dark:text-red-300",
    },
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50/80 dark:bg-green-900/80",
      borderColor: "border-green-500 dark:border-green-400",
      iconColor: "text-green-600 dark:text-green-400",
      titleColor: "text-green-800 dark:text-green-200",
      textColor: "text-green-700 dark:text-green-300",
    },
    note: {
      icon: FileText,
      bgColor: "bg-gray-50/80 dark:bg-gray-800/80",
      borderColor: "border-gray-500 dark:border-gray-400",
      iconColor: "text-gray-600 dark:text-gray-400",
      titleColor: "text-gray-800 dark:text-gray-200",
      textColor: "text-gray-700 dark:text-gray-300",
    },
    tip: {
      icon: Lightbulb,
      bgColor: "bg-purple-50/80 dark:bg-purple-900/80",
      borderColor: "border-purple-500 dark:border-purple-400",
      iconColor: "text-purple-600 dark:text-purple-400",
      titleColor: "text-purple-800 dark:text-purple-200",
      textColor: "text-purple-700 dark:text-purple-300",
    },
    question: {
      icon: HelpCircle,
      bgColor: "bg-blue-50/80 dark:bg-blue-900/80",
      borderColor: "border-blue-500 dark:border-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      titleColor: "text-blue-800 dark:text-blue-200",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    caution: {
      icon: AlertTriangle,
      bgColor: "bg-orange-50/80 dark:bg-orange-900/80",
      borderColor: "border-orange-500 dark:border-orange-400",
      iconColor: "text-orange-600 dark:text-orange-400",
      titleColor: "text-orange-800 dark:text-orange-200",
      textColor: "text-orange-700 dark:text-orange-300",
    },
    danger: {
      icon: XCircle,
      bgColor: "bg-red-50/80 dark:bg-red-900/80",
      borderColor: "border-red-500 dark:border-red-400",
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-800 dark:text-red-200",
      textColor: "text-red-700 dark:text-red-300",
    },
  }), []);

  // useMemoで最適化（未知のtypeはinfoにフォールバック）
  const config = useMemo(() => typeConfig[type] || typeConfig.info, [type, typeConfig]);
  const defaultTitle = useMemo(() => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }, [type]);
  const shouldShowTitle = useMemo(() => {
    return Boolean(title || defaultTitle);
  }, [title, defaultTitle]);
  const finalTitle = useMemo(() => {
    return title || defaultTitle;
  }, [title, defaultTitle]);

  // アイコンコンポーネントを取得
  const IconComponent = config.icon;

  return (
    <div
      className={`relative border rounded-lg p-4 my-4 shadow-sm ${config.bgColor} ${config.borderColor}`}
    >
      {/* アイコンとタイトル（上の枠線の途中に配置） */}
      <div className="absolute -top-2 left-4 bg-white dark:bg-gray-900 px-1 flex items-center gap-2">
        <IconComponent className={`text-base ${config.iconColor}`} />
        {shouldShowTitle && (
          <span className={`text-sm font-semibold ${config.titleColor}`}>
            {finalTitle}
          </span>
        )}
      </div>

      {/* コンテンツ部分 */}
      <div className="-mt-1.5 pl-2">
        {/* 本文部分 */}
        <div className={`${config.textColor} leading-relaxed`}>
          {children}
        </div>
      </div>
    </div>
  );
}
