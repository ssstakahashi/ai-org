# outside-local-ubuntu での起動

置き場所は `/home/s-takahashi/development/ai-org`。使うのは本人だけなので、開発と稼働は同じディレクトリ、同じ `.env`、同じ `npm run dev` です。別の本番ビルドや `/opt` への配置はしません。

ホストは SSH の `outside-local-ubuntu`（`ssh.studiofoods.net`）です。

## 1. 依存

- Node.js 22 以上
- PostgreSQL 14

データベースは本人のロール `s-takahashi` が所有する `ai_org` です。別ロールは作りません。

```bash
createdb ai_org
```

`.env.example` を `.env` にコピーする。`DATABASE_URL` は `postgresql://s-takahashi@127.0.0.1:5432/ai_org`。`MEDIA_ROOT` は `/home/s-takahashi/development/ai-org/data/media`。

ポート 3000 は別アプリが使っているので、ai-org は `127.0.0.1:3080` です。Mac からは次で開きます。

```bash
ssh -L 3080:127.0.0.1:3080 outside-local-ubuntu
```

ブラウザは `http://127.0.0.1:3080`。Host が localhost なので認証はスキップされます。Node.js は nvm の 22 を使います。

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

Tunnel 上で `next dev` を開くときは `next.config.ts` の `allowedDevOrigins` に `ai-org.studiofoods.net` が入っている必要があります（HMR の WebSocket）。ローカルだけで開発するなら SSH の `-L 3080:127.0.0.1:3080` で `http://127.0.0.1:3080` を使えば HMR も認証スキップもそのまま使えます。

## 2. データ

Mac で本番 D1 を取ってから、このディレクトリで PostgreSQL へ入れます。

```bash
npm install
npm run db:pull
npm run pg:migrate
npm run pg:import
npm run media:pull
```

## 3. 起動

```bash
/home/s-takahashi/.nvm/versions/node/v22.23.1/bin/npm run dev -- --hostname 127.0.0.1 --port 3080
```

常駐させる場合は、このディレクトリの `deploy/ubuntu/*.service` と `*.timer` を `~/.config/systemd/user/` にコピーします。

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
