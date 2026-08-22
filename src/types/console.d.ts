// console の型定義を拡張して警告を抑制
declare global {
  interface Console {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    log(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
  }
}

export {};
