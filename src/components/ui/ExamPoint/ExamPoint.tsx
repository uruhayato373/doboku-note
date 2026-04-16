"use client";

import { Circle } from "lucide-react";

interface ExamPointProps {
  summary: string;
  items: string[];
}

export default function ExamPoint({ summary, items }: ExamPointProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-5 mx-5 p-3 border border-gray-300 dark:border-gray-700">
      <div className="relative -left-8 bg-blue-600 text-white py-2 px-4 m-0 text-lg font-bold dark:bg-blue-500 inline-flex items-center w-auto">
        試験対策ポイント
      </div>
      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-3 ml-2">
        <span style={{ background: "linear-gradient(transparent 60%, rgba(6, 182, 212, 0.3) 60%)" }}>
          {summary}
        </span>
      </p>
      <ul className="space-y-2 list-none">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed flex items-start pl-2"
          >
            <span className="shrink-0 mr-3 mt-1.5 text-blue-600 dark:text-blue-500">
              <Circle className="w-2 h-2 fill-current" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
