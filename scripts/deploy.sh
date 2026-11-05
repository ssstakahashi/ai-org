#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${AI_ORG_HOST:-127.0.0.1}"
PORT="${AI_ORG_PORT:-3080}"
SYSTEMD_UNIT="${AI_ORG_SYSTEMD_UNIT:-ai-org.service}"
UNIT_SRC="$ROOT/deploy/ubuntu/$SYSTEMD_UNIT"
UNIT_DST="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/$SYSTEMD_UNIT"

bash scripts/check-build-env.sh

skip_git=false
commit_msg=""
for arg in "$@"; do
	case "$arg" in
		--no-git)
			skip_git=true
			;;
		*)
			if [[ -z "$commit_msg" ]]; then
				commit_msg="$arg"
			else
				commit_msg="$commit_msg $arg"
			fi
			;;
	esac
done

git_commit_and_push() {
	if [[ "$skip_git" == true ]]; then
		echo "git commit/push をスキップします（--no-git）"
		return 0
	fi

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

ensure_user_systemd_env() {
	# SSH / 非ログインシェルでは user bus 用の変数が未設定になりがち（linger 有効でも）
	if [[ -z "${XDG_RUNTIME_DIR:-}" && -d "/run/user/$(id -u)" ]]; then
		export XDG_RUNTIME_DIR="/run/user/$(id -u)"
	fi
	if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -n "${XDG_RUNTIME_DIR:-}" && -S "${XDG_RUNTIME_DIR}/bus" ]]; then
		export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
	fi
}

sync_systemd_unit() {
	if [[ ! -f "$UNIT_SRC" ]]; then
		echo "警告: $UNIT_SRC が無いため systemd unit の同期をスキップします" >&2
		return 0
	fi
	ensure_user_systemd_env
	mkdir -p "$(dirname "$UNIT_DST")"
	cp "$UNIT_SRC" "$UNIT_DST"
	systemctl --user daemon-reload
	echo "systemd unit を同期しました: $UNIT_DST"
}

restart_app_service() {
	ensure_user_systemd_env
	if ! systemctl --user cat "$SYSTEMD_UNIT" >/dev/null 2>&1; then
		echo "警告: $SYSTEMD_UNIT が未登録です。次で有効化してください:" >&2
		echo "  cp deploy/ubuntu/ai-org.service ~/.config/systemd/user/" >&2
		echo "  systemctl --user enable --now ai-org.service" >&2
		echo "手動起動: npm run start -- --hostname $HOST --port $PORT" >&2
		return 0
	fi
	systemctl --user restart "$SYSTEMD_UNIT"
	systemctl --user --no-pager status "$SYSTEMD_UNIT" || true
}

echo "next build（production）..."
npm run build

git_commit_and_push

sync_systemd_unit
echo "next start を systemd で再起動（${HOST}:${PORT}）..."
restart_app_service

echo "完了: https://ai-org.studiofoods.net （Tunnel → ${HOST}:${PORT}）"
