import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui と同じ方針で、条件付きクラスと Tailwind の競合を安全に結合する。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
