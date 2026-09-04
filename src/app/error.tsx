"use client";

type Props = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function Error({ error, reset }: Props) {
	return (
		<main className="page">
			<section className="panel">
				<h2>画面の読み込みに失敗しました</h2>
				<p className="form-error">
					{error.message || "不明なエラーが発生しました。しばらくしてから再度お試しください。"}
				</p>
				{error.digest ? (
					<p className="field-hint">エラー参照 ID: {error.digest}</p>
				) : null}
				<div className="task-actions">
					<button type="button" className="primary" onClick={() => reset()}>
						再試行
					</button>
					<button type="button" className="ghost" onClick={() => window.location.reload()}>
						ページを再読み込み
					</button>
				</div>
			</section>
		</main>
	);
}
