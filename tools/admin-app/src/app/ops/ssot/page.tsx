import { redirect } from 'next/navigation';

/** 旧「正本の検査」。管理＞設定 で資格の正本（qualification-registry.json）を開いた画面へ統合した。 */
export default function SsotPage() {
  redirect('/ops/store?k=config&d=strategy&f=config.qualification-registry');
}
