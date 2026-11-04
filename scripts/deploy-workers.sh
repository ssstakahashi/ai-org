#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OPENNEXT="$ROOT/node_modules/.bin/opennextjs-cloudflare"

bash scripts/check-build-env.sh

mode="deploy"
if [[ $# -ge 1 ]]; then
	case "$1" in
		deploy | upload)
			mode="$1"
			shift
			;;
	esac
fi

case "$mode" in
	deploy)
		"$OPENNEXT" build
		OPEN_NEXT_DEPLOY=true "$ROOT/node_modules/.bin/wrangler" deploy
		;;
	upload)
		"$OPENNEXT" build
		"$OPENNEXT" upload
		;;
	*)
		echo "用法: scripts/deploy-workers.sh [deploy|upload]" >&2
		echo "  本番公開は bun run deploy（next build + systemd restart）を使ってください。" >&2
		exit 1
		;;
esac
