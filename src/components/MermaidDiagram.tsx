"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
	code: string;
	className?: string;
};

type MermaidApi = {
	initialize: (config: Record<string, unknown>) => void;
	render: (
		id: string,
		code: string,
	) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
};

const MERMAID_CDN =
	"https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.esm.min.mjs";

let mermaidLoader: Promise<MermaidApi> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let diagramSeq = 0;

function loadMermaid(): Promise<MermaidApi> {
	if (!mermaidLoader) {
		mermaidLoader = import(/* webpackIgnore: true */ MERMAID_CDN).then(
			(mod: { default?: MermaidApi }) => {
				const mermaid = mod.default;
				if (!mermaid || typeof mermaid.render !== "function") {
					throw new Error("Failed to load mermaid");
				}
				mermaid.initialize({
					startOnLoad: false,
					theme: "default",
					securityLevel: "strict",
				});
				return mermaid;
			},
		);
	}
	return mermaidLoader;
}

function nextDiagramId() {
	diagramSeq += 1;
	return `accountingMermaid${diagramSeq}`;
}

function quoteSpecialLabels(code: string) {
	return code
		.replace(/(\b[\w-]+)\[(?!")([^\]]+)\]/g, (match, id: string, text: string) =>
			/[(){}%<>/=]/.test(text) || text.includes("<br")
				? `${id}["${text.replace(/"/g, "#quot;")}"]`
				: match,
		)
		.replace(/(\b[\w-]+)\{(?!")([^{}]+)\}/g, (match, id: string, text: string) =>
			/[()%]/.test(text) || text.includes("<br")
				? `${id}{"${text.replace(/"/g, "#quot;")}"}`
				: match,
		)
		.replace(/\|(?!")([^|\n]+)\|/g, (match, text: string) =>
			/[()%]/.test(text) ? `|"${text.replace(/"/g, "#quot;")}"|` : match,
		);
}

function renderQueued(id: string, code: string) {
	const task = async () => {
		const mermaid = await loadMermaid();
		return mermaid.render(id, code);
	};
	const result = renderQueue.then(task, task);
	renderQueue = result.then(
		() => undefined,
		() => undefined,
	);
	return result;
}

export function MermaidDiagram({ code, className }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setError(null);

		async function renderDiagram() {
			try {
				const { svg, bindFunctions } = await renderQueued(
					nextDiagramId(),
					quoteSpecialLabels(code),
				);
				if (cancelled || !ref.current) return;
				ref.current.innerHTML = svg;
				bindFunctions?.(ref.current);
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
