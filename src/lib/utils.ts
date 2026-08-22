import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 日付を安全に日本語形式でフォーマットする
 * @param dateString - 日付文字列
 * @returns フォーマットされた日付文字列、または"日付不明"
 */
export function formatDateSafely(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "日付不明";
    }
    return format(date, "yyyy年MM月dd日", {
      locale: ja,
    });
  } catch {
    return "日付不明";
  }
}

/**
 * 日付が有効かどうかをチェックする
 * @param dateString - 日付文字列
 * @returns 有効な日付の場合true、無効な場合false
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * 記事の文字数から読了時間を自動計算する関数
 * @param content - 記事の本文内容
 * @returns 読了時間（例: "5分"）
 */
export function calculateReadTime(content: string): string {
  // マークダウンの記号やHTMLタグを除去して純粋な文字数を取得
  const cleanContent = content
    .replace(/[#*`~[\](){}|\\\-_=+>]/g, "") // マークダウン記号を除去
    .replace(/<[^>]*>/g, "") // HTMLタグを除去
    .replace(/\s+/g, " ") // 連続する空白を単一の空白に
    .trim();

  // 日本語の平均読書速度（1分間に600文字）
  const charactersPerMinute = 600;

  // 読了時間を計算（分単位、切り上げ）
  const minutes = Math.ceil(cleanContent.length / charactersPerMinute);

  // 最小1分、最大20分で制限
  const clampedMinutes = Math.max(1, Math.min(20, minutes));

  return `${clampedMinutes}分`;
}

/**
 * 記事の文字数を取得する関数
 * @param content - 記事の本文内容
 * @returns 文字数
 */
export function getCharacterCount(content: string): number {
  const cleanContent = content
    .replace(/[#*`~[\](){}|\\\-_=+>]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanContent.length;
}

/**
 * 記事IDに基づいてOGP画像のパスを生成
 * @param postId 記事ID
 * @returns OGP画像のパス
 */
export function getOGPImagePath(postId: string): string {
  return `/images/ogp/${postId}.png`;
}

/**
 * 記事IDに基づいてブログ画像ディレクトリのパスを生成
 * @param postId 記事ID
 * @returns ブログ画像ディレクトリのパス
 */
export function getArticleImageDir(postId: string): string {
  return `/images/blog/${postId}/`;
}
