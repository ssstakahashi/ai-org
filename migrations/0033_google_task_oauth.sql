-- Google Tasks OAuth のリフレッシュトークン（Web クライアントの callback で保存）

ALTER TABLE google_task_sync_state ADD COLUMN oauth_refresh_token TEXT;
