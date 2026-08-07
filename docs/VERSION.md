# バージョン履歴

`package.json` の `version` と同期する。git コミットのたびにこのファイルを更新する（規約: `.cursor/rules/version-changelog-on-commit.mdc`）。

## 0.0.2 (2026-08-08)

- バージョン表示を git タグ（v なし）優先、未タグ時は package.json に変更
- タスク詳細パネルから削除できるように追加

## 0.0.1 (2026-08-08)

- ナビに git describe 由来のバージョン表示を追加
- 完了タスクに取り消し線を表示（カレンダー・ガント）
- タスク詳細→編集ダイアログ切替の不具合を flushSync で修正
- open-next の skewProtection 設定を spread で正しくマージ

## 0.0.0 (2026-08-08)

- 初回コミット。ai-org の現状スナップショット。
