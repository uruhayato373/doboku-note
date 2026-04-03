import Image from "next/image";
import React from "react";

type ChatBubbleProps = {
  role: "question" | "answer";
  icon: string; // アイコン画像のパス
  children: React.ReactNode;
};

export default function ChatBubble({ role, icon, children }: ChatBubbleProps) {
  const isQuestion = role === "question";

  return (
    <div
      className={`flex items-start gap-3 my-4 ${
        isQuestion ? "justify-start" : "justify-end"
      }`}
    >
      {/* アイコン（質問は左、回答は右） */}
      {isQuestion && (
        <div className="flex-shrink-0 pt-1">
          <Image
            src={icon}
            alt={role}
            width={40}
            height={40}
            className="rounded shadow-sm dark:shadow-gray-600"
            sizes="40px"  // 固定サイズ（40x40）
          />
        </div>
      )}

      {/* 吹き出し */}
      <div
        className={`
          relative max-w-[70%] p-3 rounded-xl shadow dark:shadow-gray-800 flex-shrink-0
          ${
            isQuestion
              ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              : "bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-gray-100"
          }
        `}
      >
        {/* 三角部分 */}
        <div
          className={`
            absolute top-3 w-0 h-0 border-[8px] 
            ${
              isQuestion
                ? "border-r-gray-100 dark:border-r-gray-700 -left-2 border-t-transparent border-b-transparent border-l-transparent border-r-solid"
                : "border-l-blue-100 dark:border-l-blue-900 -right-2 border-t-transparent border-b-transparent border-r-transparent border-l-solid"
            }
          `}
        />
        <div className="relative z-10 m-0 p-0 [&>*]:m-0 [&>*]:p-0 whitespace-pre-wrap">
          {children}
        </div>
      </div>

      {!isQuestion && (
        <div className="flex-shrink-0 pt-1">
          <Image
            src={icon}
            alt={role}
            width={40}
            height={40}
            className="rounded shadow-sm dark:shadow-gray-600"
            sizes="40px"  // 固定サイズ（40x40）
          />
        </div>
      )}
    </div>
  );
}
