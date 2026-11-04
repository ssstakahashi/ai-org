# outside-local-ubuntu での起動

置き場所は `/home/s-takahashi/development/ai-org`。使うのは本人だけなので、開発と稼働は同じディレクトリ、同じ `.env` です。**外向き公開**は `next dev` ではなく **`bun run deploy`（`next build` + `next start`）** です。別の `/opt` 配置はしません。

ホストは SSH の `outside-local-ubuntu`（`ssh.studiofoods.net`）です。

## 1. 依存

- Node.js 22 以上
- PostgreSQL 14

データベースは本人のロール `s-takahashi` が所有する `ai_org` です。別ロールは作りません。

```bash
createdb ai_org
```

`.env.example` を `.env` にコピーする。`DATABASE_URL` は `postgresql://s-takahashi@127.0.0.1:5432/ai_org`。`MEDIA_ROOT` は `/home/s-takahashi/development/ai-org/data/media`。

ポート 3000 は別アプリが使っているので、**本番**は `127.0.0.1:3080`、**開発（dev）**は `127.0.0.1:3081` です。同時に動かしても競合しません。

Mac から dev を見るとき:

```bash
ssh -L 3081:127.0.0.1:3081 outside-local-ubuntu
```

ブラウザは `http://127.0.0.1:3081`。Host が localhost なので認証はスキップされます。Node.js は nvm の 22 を使います。

本番（Tunnel 先）をローカルで確認するときだけ 3080 を転送:

```bash
ssh -L 3080:127.0.0.1:3080 outside-local-ubuntu
```

## 1b. 外向き（Cloudflare Tunnel）

受信ポートは開けません。`incometax-demo-api` と同様、専用トンネル `ai-org` で `https://ai-org.studiofoods.net` だけを `127.0.0.1:3080` に届けます。

- 設定: `deploy/ubuntu/cloudflared/config.yml`（資格情報は `~/.cloudflared/308c7fd6-0c07-46a4-8536-cfefcaf7e0ef.json`）
- 常駐: pm2 名 `ai-org-cloudflared`

```bash
pm2 start /usr/local/bin/cloudflared --name ai-org-cloudflared -- \
  tunnel --config /home/s-takahashi/development/ai-org/deploy/ubuntu/cloudflared/config.yml run
pm2 save
```

`.env` の `APP_PUBLIC_URL` は `https://ai-org.studiofoods.net` を推奨（画像 URL の絶対パス用）。Tunnel 経由では `Host` が公開名になるため、パスワード認証が有効になります。

情報メニューの **OpenClaw** は `OPENCLAW_CONTROL_UI_URL` へリダイレクトする。別 PC の Control UI を ai-org と同様に **Cloudflare Tunnel（＋ Access）** で HTTPS 公開し、その URL を `.env` に書く（例: `https://openclaw.studiofoods.net`）。未設定のときは `/openclaw` に手順を表示する。

Tunnel 上の公開 URL（`https://ai-org.studiofoods.net`）は production（3080）のみです。サーバー上で dev を回すときは **`npm run dev:server`（3081）** を使い、本番 `next start`（3080）と並行できます。

## 2. データ

Mac で本番 D1 を取ってから、このディレクトリで PostgreSQL へ入れます。

```bash
npm install
npm run db:pull
npm run pg:migrate
npm run pg:import
npm run media:pull
```

## 3. 起動（初回・常駐）

公開 URL 用は **`bun run deploy`**（`next build` → user systemd `ai-org.service` を `next start` で再起動）。unit は `deploy/ubuntu/ai-org.service` を `~/.config/systemd/user/` に同期します。

```bash
# 初回: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY を .env に置いてから
bun run deploy --no-git

# 以降（変更を commit/push してから本番反映）
bun run deploy
# bun run deploy -- "コミットメッセージ"
# サーバー上だけ再ビルド: bun run deploy --no-git
```

ローカル開発（サーバー上・3081）:

```bash
/home/s-takahashi/.nvm/versions/node/v22.23.1/bin/npm run dev:server
```

常駐させる場合は、このディレクトリの `deploy/ubuntu/*.service` と `*.timer` を `~/.config/systemd/user/` にコピーします（`bun run deploy` も `ai-org.service` を上書き同期します）。

```bash
mkdir -p ~/.config/systemd/user
cp deploy/ubuntu/ai-org.service deploy/ubuntu/ai-org-google-tasks.service deploy/ubuntu/ai-org-google-tasks.timer deploy/ubuntu/ai-org-x-due.service deploy/ubuntu/ai-org-x-due.timer deploy/ubuntu/ai-org-blog-reconcile.service deploy/ubuntu/ai-org-blog-reconcile.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now ai-org.service
```

ログアウト後もタイマーを動かす場合だけ `sudo loginctl enable-linger s-takahashi` を実行します。

Google Tasks の二重同期を避けるため、タイマーを有効にする前に Cloudflare 側の Cron を止めてください。

```bash
systemctl --user enable --now ai-org-google-tasks.timer
systemctl --user enable --now ai-org-blog-reconcile.timer
systemctl --user enable --now ai-org-x-due.timer
```
