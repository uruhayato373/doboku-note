export interface Post {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  content: string;
  headings: {
    id?: string; // Make id optional
    text: string;
    level: number;
  }[];
  isPremium: boolean;
  readTime?: string;
  relatedPosts?: string[];
}

// Post with related posts
export interface PostData extends Post {
  relatedPosts?: string[];
}
