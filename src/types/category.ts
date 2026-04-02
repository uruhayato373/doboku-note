export interface CategoryConfig {
  path: string;
  subtitle: string;
  subCategories: string[];
  variant: "shigodeki" | "ikeoji";
  icon: "FaHeart" | "FaBriefcase";
}

export interface CategoriesConfig {
  [key: string]: CategoryConfig;
}
