import tagsData from "@/config/tags.json";
import { Tag } from "lucide-react";

interface TagListProps {
  tags: string[];
}

const getSlugByName = (name: string) => {
  const tagInfo = tagsData.find((t) => t.name === name);
  return tagInfo ? tagInfo.slug : name;
};

export default function TagList({ tags }: TagListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        タグ
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <a
            key={tag}
            href={`/tags/${getSlugByName(tag)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Tag className="w-3 h-3" />
            {tag}
          </a>
        ))}
      </div>
    </div>
  );
}
