#!/usr/bin/env bash
# 本番 D1（remote）の内容をローカル D1 に上書きコピーする。
# 使い方: npm run db:pull
# オプション: --keep  … ダンプ SQL を .tmp/ に残す
#
# 注意: wrangler のフル export は CREATE TABLE の順序が FK 依存と逆転することがあり
# （tasks が categories より先）、そのままでは import に失敗する。
# そのためスキーマはローカル migrations で作り、データだけ本番から入れる。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_NAME="ai-org"
TMP_DIR=".tmp"
DUMP="$TMP_DIR/d1-prod-export.sql"
IMPORT="$TMP_DIR/d1-prod-import.sql"
KEEP=0

for arg in "$@"; do
	case "$arg" in
		--keep) KEEP=1 ;;
		-h|--help)
			cat <<'EOF'
本番 D1 をローカルへコピーします（ローカル D1 は上書きされます）。

Usage:
  npm run db:pull
  npm run db:pull -- --keep

Options:
  --keep   エクスポート SQL を .tmp/ に残す
EOF
			exit 0
			;;
		*)
			echo "不明な引数: $arg" >&2
			echo "npm run db:pull -- --help" >&2
			exit 1
			;;
	esac
done

if ! command -v npx >/dev/null 2>&1; then
	echo "npx が見つかりません" >&2
	exit 1
fi

mkdir -p "$TMP_DIR"

echo "==> 本番 D1 (${DB_NAME}) のデータをエクスポート中（スキーマなし）..."
npx wrangler d1 export "$DB_NAME" --remote --no-schema --output="$DUMP" --skip-confirmation

if [[ ! -s "$DUMP" ]]; then
	echo "エクスポートファイルが空です: $DUMP" >&2
	exit 1
fi

echo "==> インポート用 SQL を準備中..."
{
	echo "PRAGMA foreign_keys=OFF;"
	echo "PRAGMA defer_foreign_keys=ON;"
	# マイグレーション履歴・シーケンスはローカル apply 側を正とする
	# トランザクション文も除去
	sed -E \
		-e '/^(BEGIN(\s+TRANSACTION)?|COMMIT|ROLLBACK)\s*;?\s*$/Id' \
		-e '/^PRAGMA /Id' \
		-e '/^INSERT INTO "d1_migrations"/Id' \
		-e '/^DELETE FROM sqlite_sequence/Id' \
		-e '/^INSERT INTO "sqlite_sequence"/Id' \
		"$DUMP"
	echo "PRAGMA defer_foreign_keys=OFF;"
	echo "PRAGMA foreign_keys=ON;"
} > "$IMPORT"

echo "==> ローカル D1 をリセット中..."
rm -rf .wrangler/state/v3/d1

echo "==> ローカルへマイグレーション適用中（スキーマ作成）..."
# 非対話では確認が自動 yes になる
npx wrangler d1 migrations apply "$DB_NAME" --local < /dev/null

echo "==> シード行をクリア中（本番データで置き換えるため）..."
npx wrangler d1 execute "$DB_NAME" --local --yes --command \
	"PRAGMA foreign_keys=OFF; DELETE FROM task_tags; DELETE FROM tasks; DELETE FROM x_posts; DELETE FROM tags; DELETE FROM categories; DELETE FROM employees; DELETE FROM org_rules; DELETE FROM app_crons; DELETE FROM apps; DELETE FROM app_names; DELETE FROM app_groups; DELETE FROM app_types; DELETE FROM automation_runs; DELETE FROM remote_automations; PRAGMA foreign_keys=ON;"

echo "==> 本番データをローカルへインポート中..."
npx wrangler d1 execute "$DB_NAME" --local --file="$IMPORT" --yes

if [[ "$KEEP" -eq 0 ]]; then
	rm -f "$DUMP" "$IMPORT"
else
	echo "==> ダンプを保持: $DUMP / $IMPORT"
fi

echo "==> 完了: 本番 D1 をローカルへコピーしました"
echo "    ※ R2（画像）は含まれません。image_key 参照だけ本番と同じになります。"
