/** ビルド時に next.config.ts から注入されるアプリバージョン（git タグ or package.json） */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
