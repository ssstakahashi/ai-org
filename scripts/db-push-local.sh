#!/usr/bin/env bash
# ローカル D1 の内容を本番 D1（remote）に上書きコピーする。
# 使い方: npm run db:push
# オプション:
#   --keep  … ダンプ SQL を .tmp/ に残す
#   --yes   … 確認プロンプトをスキップ（本番上書きに注意）
#
# 注意: wrangler のフル export は CREATE TABLE の順序が FK 依存と逆転することがあり
# （tasks が categories より先）、そのままでは import に失敗する。
# そのためスキーマはリモート migrations で揃え、データだけローカルから入れる。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_NAME="ai-org"
TMP_DIR=".tmp"
DUMP="$TMP_DIR/d1-local-export.sql"
IMPORT="$TMP_DIR/d1-local-import.sql"
KEEP=0
YES=0

for arg in "$@"; do
	case "$arg" in
		--keep) KEEP=1 ;;
		--yes|-y) YES=1 ;;
		-h|--help)
			cat <<'EOF'
ローカル D1 を本番へコピーします（本番 D1 のデータは上書きされます）。

Usage:
  npm run db:push
  npm run db:push -- --keep
  npm run db:push -- --yes

Options:
  --keep   エクスポート SQL を .tmp/ に残す
  --yes    確認プロンプトをスキップ
EOF
			exit 0
			;;
		*)
			echo "不明な引数: $arg" >&2
			echo "npm run db:push -- --help" >&2
			exit 1
			;;
	esac
done

if ! command -v npx >/dev/null 2>&1; then
	echo "npx が見つかりません" >&2
	exit 1
fi

if [[ ! -d .wrangler/state/v3/d1 ]]; then
	echo "ローカル D1 が見つかりません。.wrangler/state/v3/d1 がありません。" >&2
	echo "先に npm run dev や migrations apply --local でローカル DB を用意してください。" >&2
	exit 1
fi

if [[ "$YES" -eq 0 ]]; then
	echo "⚠ 本番 D1 (${DB_NAME}) のデータをローカル内容で上書きします。"
	echo "  R2（画像）は含まれません。image_key 参照だけローカルと同じになります。"
	printf "続行する場合は yes と入力: "
	read -r confirm
	if [[ "$confirm" != "yes" ]]; then
		echo "中止しました。"
		exit 1
	fi
fi

mkdir -p "$TMP_DIR"

echo "==> ローカル D1 (${DB_NAME}) のデータをエクスポート中（スキーマなし）..."
npx wrangler d1 export "$DB_NAME" --local --no-schema --output="$DUMP" --skip-confirmation

if [[ ! -s "$DUMP" ]]; then
	echo "エクスポートファイルが空です: $DUMP" >&2
	exit 1
fi

echo "==> インポート用 SQL を準備中..."
{
	echo "PRAGMA foreign_keys=OFF;"
	echo "PRAGMA defer_foreign_keys=ON;"
	# マイグレーション履歴・シーケンスはリモート apply 側を正とする
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

echo "==> 本番へマイグレーション適用中（スキーマ同期）..."
npx wrangler d1 migrations apply "$DB_NAME" --remote < /dev/null

echo "==> 本番の既存行をクリア中（ローカルデータで置き換えるため）..."
npx wrangler d1 execute "$DB_NAME" --remote --yes --command \
	"PRAGMA foreign_keys=OFF; DELETE FROM task_tags; DELETE FROM tasks; DELETE FROM x_posts; DELETE FROM tags; DELETE FROM categories; DELETE FROM employees; DELETE FROM org_rules; DELETE FROM app_crons; DELETE FROM apps; DELETE FROM app_names; DELETE FROM app_groups; DELETE FROM app_types; DELETE FROM automation_runs; DELETE FROM remote_automations; PRAGMA foreign_keys=ON;"

echo "==> ローカルデータを本番へインポート中..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$IMPORT" --yes

if [[ "$KEEP" -eq 0 ]]; then
	rm -f "$DUMP" "$IMPORT"
else
	echo "==> ダンプを保持: $DUMP / $IMPORT"
fi

echo "==> 完了: ローカル D1 を本番へコピーしました"
echo "    ※ R2（画像）は含まれません。image_key 参照だけローカルと同じになります。"
