// "use server"; // 静的エクスポート用に一時的に無効化

import { revalidateTag } from "next/cache";

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string | null;
  siteName?: string;
}

// 特定のホストのキャッシュをクリア
export async function revalidateLinkMetadata(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const tag = `link-metadata-${urlObj.hostname}`;
    revalidateTag(tag);
  } catch (error) {
    // キャッシュクリアエラーは静かに処理
  }
}

// 特定のホストのメタデータを強制的に再取得
export async function refreshLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const urlObj = new URL(url);

    // ローカルホストや内部URLの場合はスキップ
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
      return {
        siteName: urlObj.hostname,
        title: urlObj.hostname,
        description: "ローカル環境のためメタデータを取得できません",
        image: null,
      };
    }

    // キャッシュを無効にして強制的に再取得
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkCard-Bot/1.0)",
      },
      cache: "no-store", // キャッシュしない
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // メタデータを抽出
    return extractMetadataFromHtml(html, urlObj);
  } catch (error) {
    // エラーが発生した場合のフォールバック処理
    try {
      const urlObj = new URL(url);
      return {
        siteName: urlObj.hostname.replace("www.", ""),
        title: urlObj.hostname,
        description: "メタデータの再取得に失敗しました",
        image: null,
      };
    } catch (e) {
      return {
        siteName: "サイト名なし",
        title: "タイトルなし",
        description: "URLの解析に失敗しました",
        image: null,
      };
    }
  }
}

// メタデータ抽出のヘルパー関数
function extractMetadataFromHtml(html: string, urlObj: URL): LinkMetadata {
  const metadata: LinkMetadata = {};

  // title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    metadata.title = titleMatch[1].trim();
  }

  // description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (descMatch?.[1]) {
    metadata.description = descMatch[1].trim();
  }

  // og:description
  const ogDescMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogDescMatch?.[1] && !metadata.description) {
    metadata.description = ogDescMatch[1].trim();
  }

  // og:image
  const ogImageMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogImageMatch?.[1]) {
    metadata.image = ogImageMatch[1].trim();
  }

  // og:site_name
  const ogSiteMatch = html.match(
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogSiteMatch?.[1]) {
    metadata.siteName = ogSiteMatch[1].trim();
  }

  // ドメイン名をフォールバックとして使用
  if (!metadata.siteName) {
    metadata.siteName = urlObj.hostname.replace("www.", "");
  }

  return metadata;
}

export async function getLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    // URLの検証
    const urlObj = new URL(url);

    // ローカルホストや内部URLの場合はスキップ
    if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
      return {
        siteName: urlObj.hostname,
        title: urlObj.hostname,
        description: "ローカル環境のためメタデータを取得できません",
        image: null,
      };
    }

    // リンク先のHTMLを取得（Next.jsのキャッシュ機能を活用）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15秒に延長

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LinkCard-Bot/1.0; +https://kakomu.com)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
        // Next.jsのキャッシュ機能を活用
        next: {
          revalidate: 86400, // 24時間後に再検証
          tags: [`link-metadata-${urlObj.hostname}`], // ホスト名ベースのタグ
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // コンテンツサイズのチェック（2MB制限を回避）
      if (html.length > 2 * 1024 * 1024) {
        // 大きなコンテンツの場合は、HTMLの最初の部分のみを使用
        const truncatedHtml = html.substring(0, 1024 * 1024); // 1MBまで制限
        return extractMetadataFromHtml(truncatedHtml, urlObj);
      }

      // メタデータを抽出
      const metadata = extractMetadataFromHtml(html, urlObj);
      return metadata;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    // エラーが発生した場合のフォールバック処理
    try {
      const urlObj = new URL(url);
      const fallbackMetadata = {
        siteName: urlObj.hostname.replace("www.", ""),
        title: urlObj.hostname,
        description: `メタデータの取得に失敗しました (${
          error instanceof Error ? error.message : "Unknown error"
        })`,
        image: null,
      };
      return fallbackMetadata;
    } catch (e) {
      return {
        siteName: "サイト名なし",
        title: "タイトルなし",
        description: "URLの解析に失敗しました",
        image: null,
      };
    }
  }
}
