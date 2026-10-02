import NotePopCta from '@/components/ui/NotePopCta/NotePopCta';
/** トップの教材一覧への入口。文字と先生素材で本文CTAと意匠を揃える。 */
export default function PremiumNoteHero() {
  return <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
    <NotePopCta href="/links" qualification="土木・建設系資格" title="note 有料教材"
      subtitle="模範論文・施工経験記述・記述解答のフル完成答案" button="教材一覧を見る"
      themeVar="--accent" pose="smile" trackLabel="home-note-hero" placement="home-hero" />
  </section>;
}
