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

mode="deploy"
commit_msg=""
if [[ $# -ge 1 ]]; then
	case "$1" in
		deploy | upload)
			mode="$1"
			shift
			;;
	esac
	commit_msg="${*:-}"
fi

git_commit_and_push() {
	if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
		echo "git リポジトリではないため commit/push をスキップします" >&2
		return 0
	fi

	local branch
	branch="$(git rev-parse --abbrev-ref HEAD)"
	if [[ "$branch" == "HEAD" ]]; then
		echo "エラー: detached HEAD のため commit/push できません" >&2
		exit 1
	fi

	git add -A

	if git diff --cached --quiet; then
		echo "コミットする変更はありません"
	else
		if [[ -z "$commit_msg" ]]; then
			commit_msg="deploy: $(date '+%Y-%m-%d %H:%M')"
		fi
		echo "コミットします: $commit_msg"
		git status --short
		git commit -m "$commit_msg"
	fi

	if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
		echo "push します: $branch"
		git push
	else
		echo "push します: origin/$branch （upstream 未設定のため -u）"
		git push -u origin "$branch"
	fi
}

case "$mode" in
	deploy)
		git_commit_and_push
		"$OPENNEXT" build
		OPEN_NEXT_DEPLOY=true "$ROOT/node_modules/.bin/wrangler" deploy
		;;
	upload)
		"$OPENNEXT" build
		"$OPENNEXT" upload
		;;
	*)
		echo "用法: scripts/deploy.sh [deploy|upload] [commit message]" >&2
		exit 1
		;;
esac
