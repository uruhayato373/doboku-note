import sharp from "sharp";

/**
 * 画像をWebP形式に変換して最適化する
 * @param buffer - 元の画像バッファ
 * @param quality - 品質（1-100）
 * @returns 最適化されたWebP画像のバッファ
 */
export async function optimizeImageToWebP(
  buffer: Buffer,
  quality: number = 85
): Promise<Buffer> {
  try {
    return await sharp(buffer).webp({ quality }).toBuffer();
  } catch (error) {
    console.error("画像最適化エラー:", error);
    return buffer; // エラー時は元の画像を返す
  }
}

/**
 * 画像のリサイズと最適化を行う
 * @param buffer - 元の画像バッファ
 * @param width - 幅
 * @param height - 高さ
 * @param quality - 品質（1-100）
 * @returns 最適化された画像のバッファ
 */
export async function resizeAndOptimizeImage(
  buffer: Buffer,
  width: number,
  height: number,
  quality: number = 85
): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality })
      .toBuffer();
  } catch (error) {
    console.error("画像リサイズ・最適化エラー:", error);
    return buffer;
  }
}

/**
 * 画像のメタデータを取得する
 * @param buffer - 画像バッファ
 * @returns 画像のメタデータ
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    };
  } catch (error) {
    console.error("メタデータ取得エラー:", error);
    return null;
  }
}

/**
 * 画像のプレースホルダー（blur）を生成する
 * @param buffer - 元の画像バッファ
 * @param width - 幅
 * @param height - 高さ
 * @returns プレースホルダー画像のbase64文字列
 */
export async function generateBlurPlaceholder(
  buffer: Buffer,
  width: number = 20,
  height: number = 20
): Promise<string> {
  try {
    const placeholder = await sharp(buffer)
      .resize(width, height)
      .blur(10)
      .toBuffer();

    return `data:image/webp;base64,${placeholder.toString("base64")}`;
  } catch (error) {
    console.error("プレースホルダー生成エラー:", error);
    return "";
  }
}
