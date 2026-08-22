export type PeSection = {
  id: string;
  title: string;
  keywords?: { slug: string; title: string }[];
};

export type PeChapter = {
  id: string;
  title: string;
  sections: PeSection[];
};
