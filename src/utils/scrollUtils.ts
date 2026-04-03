export function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (element) {
    const headerHeight = 80; // ヘッダーの高さを考慮
    const elementPosition = element.offsetTop - headerHeight;

    window.scrollTo({
      top: elementPosition,
      behavior: "smooth",
    });
  }
} 