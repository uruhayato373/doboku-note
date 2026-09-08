import { PageHead } from '@/components/ui';
import CharacterCatalog from '@/components/CharacterCatalog';
import { findRepoRoot } from '@/lib/repo-root';
import { readCharacterCatalog } from '../../../../../../scripts/lib/character-catalog.mjs';

export const dynamic = 'force-dynamic';

export default function CharactersPage() {
  try {
    const catalog = readCharacterCatalog(findRepoRoot());
    return <>
      <PageHead title="キャラクター素材" sub={`${catalog.name} · 用途に合うポーズを探して、並べて比較できます。`} />
      <CharacterCatalog catalog={catalog} />
    </>;
  } catch {
    return <>
      <PageHead title="キャラクター素材" />
      <div className="empty" role="alert">ポーズ台帳を読み込めません。character-poses.json の分類・画像名を確認してください。</div>
    </>;
  }
}
