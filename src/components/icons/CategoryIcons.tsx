import { Briefcase, Heart } from "lucide-react";

export const getCategoryIcon = (iconName: string, className?: string) => {
  const defaultClassName = "w-10 h-10 md:w-12 md:h-12 text-white";
  const iconClassName = className || defaultClassName;

  switch (iconName) {
    case "Heart":
      return <Heart className={iconClassName} />;
    case "Briefcase":
      return <Briefcase className={iconClassName} />;
    default:
      return <Briefcase className={iconClassName} />;
  }
};
