export interface HeadingItem {
  id?: string;
  text: string;
  level: number;
}

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

// Post summary without full content
export interface PostSummary {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  isPremium: boolean;
  readTime?: string;
}
