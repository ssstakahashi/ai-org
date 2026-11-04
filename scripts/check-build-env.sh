#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

while IFS= read -r line; do
	[[ "$line" =~ ^export[[:space:]] ]] && eval "$line"
done < <(
	node --input-type=module -e "
import { loadEnvFiles } from './scripts/load-env.mjs';
loadEnvFiles(['.env', '/etc/ai-org.env', '.dev.vars']);
const k = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;
if (k) console.log('export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=' + JSON.stringify(k));
"
)

if [[ -z "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" ]]; then
	echo "エラー: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY が未設定です。" >&2
	echo "  1. openssl rand -base64 32 でキーを生成" >&2
	echo "  2. .env（または /etc/ai-org.env）に NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=... を追加" >&2
	echo "  README の「デプロイ」セクションも参照" >&2
	exit 1
fi

export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
