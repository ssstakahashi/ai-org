/** ビルド時に next.config.ts から注入される git describe の結果 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
