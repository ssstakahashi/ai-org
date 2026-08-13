#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

has_key=false
if [[ -n "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" ]]; then
	has_key=true
elif [[ -f .dev.vars ]] && grep -qE '^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=' .dev.vars; then
	has_key=true
fi

if [[ "$has_key" != true ]]; then
	echo "エラー: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY が未設定です。" >&2
	echo "  1. openssl rand -base64 32 でキーを生成" >&2
	echo "  2. .dev.vars に NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=... を追加" >&2
	echo "  README の「デプロイ」セクションも参照" >&2
	exit 1
fi
