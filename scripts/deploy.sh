#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OPENNEXT="$ROOT/node_modules/.bin/opennextjs-cloudflare"

bash scripts/check-build-env.sh

if [[ -z "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" && -f .dev.vars ]]; then
	NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(grep -E '^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=' .dev.vars | cut -d= -f2- | head -1)"
	export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
fi

mode="${1:-deploy}"
case "$mode" in
	deploy)
		"$OPENNEXT" build
		OPEN_NEXT_DEPLOY=true "$ROOT/node_modules/.bin/wrangler" deploy
		;;
	upload)
		"$OPENNEXT" build
		OPEN_NEXT_DEPLOY=true "$ROOT/node_modules/.bin/wrangler" deploy --dry-run
		;;
	*)
		echo "用法: scripts/deploy.sh [deploy|upload]" >&2
		exit 1
		;;
esac
