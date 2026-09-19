"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
	code: string;
	className?: string;
};

export function MermaidDiagram({ code, className }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function renderDiagram() {
			try {
				// @ts-expect-error -- mermaid は CDN から読み込む
				if (typeof window.mermaid === "undefined") {
					const script = document.createElement("script");
					script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
					script.type = "module";
					await new Promise<void>((resolve, reject) => {
						script.onload = () => resolve();
						script.onerror = () => reject(new Error("Failed to load mermaid"));
						document.head.appendChild(script);
					});

					// @ts-expect-error -- mermaid を初期化
					await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
					// @ts-expect-error -- mermaid を設定
					window.mermaid.initialize({ startOnLoad: false, theme: "default" });
				}

				if (cancelled || !ref.current) return;

				ref.current.innerHTML = "";
				// @ts-expect-error -- mermaid.render を使用
				const { svg } = await window.mermaid.render(`mermaid-${Date.now()}`, code);
				if (cancelled || !ref.current) return;
				ref.current.innerHTML = svg;
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : String(err));
				}
			}
		}

		renderDiagram();

		return () => {
			cancelled = true;
		};
	}, [code]);

	if (error) {
		return (
			<div
				className={`panel ${className ?? ""}`}
				style={{ color: "var(--danger)", padding: "1rem" }}
			>
				Mermaid diagram error: {error}
			</div>
		);
	}

	return <div ref={ref} className={className ?? ""} />;
}
