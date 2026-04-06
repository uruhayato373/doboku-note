export type PeSection = {
  id: string;
  title: string;
};

export type PeChapter = {
  id: string;
  title: string;
  sections: PeSection[];
};
