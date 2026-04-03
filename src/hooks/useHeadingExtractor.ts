import { useEffect, useState } from "react";
import { HeadingItem } from "@/types/blog";

export function useHeadingExtractor(content: string) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // DOM要素の検索を遅延実行するための関数
      const extractHeadingsFromDOM = () => {
        const articleElement = document.querySelector("article");
        const contentElement = articleElement?.querySelector(".blog-content");

        if (contentElement) {
          const headingElements = contentElement.querySelectorAll("h2, h3");

          if (headingElements.length > 0) {
            const extractedHeadings: HeadingItem[] = [];

            headingElements.forEach((element, index) => {
              const level = parseInt(element.tagName.charAt(1));
              const text = element.textContent || "";
              const id = generateHeadingId(element, text, index);

              extractedHeadings.push({
                id,
                text,
                level,
              });
            });

            setHeadings(extractedHeadings);
            setIsLoading(false);
            return true; // 見出しが見つかった
          }
        }
        return false; // 見出しが見つからなかった
      };

      // まずすぐに実行
      if (extractHeadingsFromDOM()) {
        return; // 見出しが見つかったので終了
      }

      // 見つからない場合は少し待ってからリトライ
      const timeoutId = setTimeout(() => {
        if (extractHeadingsFromDOM()) {
          return; // 見出しが見つかったので終了
        }

        // それでも見つからない場合は、文字列から見出しを抽出
        const extractedHeadings = extractHeadingsFromMarkdown(content);
        setHeadings(extractedHeadings);
        setIsLoading(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("[useHeadingExtractor] Error:", error);
      // エラーが発生した場合もMarkdownから抽出を試す
      const extractedHeadings = extractHeadingsFromMarkdown(content);
      setHeadings(extractedHeadings);
      setIsLoading(false);
      return;
    }
  }, [content]);

  return { headings, isLoading };
}

// Markdown文字列から見出しを抽出する関数
function extractHeadingsFromMarkdown(content: string): HeadingItem[] {
  const lines = content.split("\n");
  const headings: HeadingItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // ## または ### で始まる行を見出しとして認識
    if (trimmed.match(/^#{2,3}\s+/)) {
      const level = (trimmed.match(/^#+/) || [""])[0].length;
      const text = trimmed.replace(/^#+\s*/, "").trim();

      if (text && (level === 2 || level === 3)) {
        const id = generateMarkdownHeadingId(text, index);
        headings.push({
          id,
          text,
          level,
        });
      }
    }
  });

  return headings;
}

// Markdown用のID生成関数
function generateMarkdownHeadingId(text: string, index: number): string {
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return id || `heading-${index}`;
}

function generateHeadingId(
  element: Element,
  text: string,
  index: number
): string {
  let id = element.id;
  if (!id) {
    // テキストから安全なIDを生成
    id = text
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // 空のIDや重複を避ける
    if (!id || id === "-") {
      id = `heading-${index}`;
    }

    // 重複チェック
    let counter = 1;
    let finalId = id;
    while (document.getElementById(finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }

    element.id = finalId;
    id = finalId;
  }
  return id;
}
