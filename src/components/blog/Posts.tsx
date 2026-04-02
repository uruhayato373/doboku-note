import type { Post } from "@/types/blog";
import BlogCard from "@/components/ui/BlogCard/BlogCard";

interface PostsProps {
  posts: Post[];
}

export default function Posts({ posts }: PostsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} variant="default" />
      ))}
    </div>
  );
}
