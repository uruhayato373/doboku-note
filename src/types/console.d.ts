// console の型定義を拡張して警告を抑制
declare global {
  interface Console {
    error(...args: any[]): void;
    warn(...args: any[]): void;
    log(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
  }
}

export {};
