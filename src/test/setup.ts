import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Next.jsのImageコンポーネントのモック
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return { type: 'img', props: { src, alt, ...props } };
  },
}));

// Next.jsのLinkコンポーネントのモック
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return { type: 'a', props: { href, ...props, children } };
  },
}));

// Next.jsのuseRouterのモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// グローバルなテスト環境の設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserverのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})); 