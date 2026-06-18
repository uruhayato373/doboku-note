import { getLinkMetadata } from '../../../lib/actions/link-metadata-actions';
import LinkCardClient from './LinkCardClient';

interface LinkCardProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly siteName?: string;
  readonly imageUrl?: string;
}

export default async function LinkCard({
  url,
  title,
  description,
  siteName,
  imageUrl,
}: LinkCardProps) {
  // サーバーサイドでメタデータを取得
  const metadata = await getLinkMetadata(url);

  // 表示する情報を決定（props優先、metadataでフォールバック）
  const displayTitle = title || metadata.title || 'タイトルなし';
  const displayDescription = description || metadata.description || '';
  const displayImage = imageUrl || metadata.image || '';
  const displaySiteName = siteName || metadata.siteName || '';

  return (
    <LinkCardClient
      url={url}
      title={displayTitle}
      description={displayDescription}
      imageUrl={displayImage}
      siteName={displaySiteName}
    />
  );
}
