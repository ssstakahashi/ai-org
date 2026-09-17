import {
	parseMarkdownPreview,
	type BlockNode,
	type InlineNode,
} from "@/lib/markdown-preview";

type Props = {
	markdown: string;
	className?: string;
};

function Inline({ nodes }: { nodes: InlineNode[] }) {
	return nodes.map((node, index) => {
		const key = `${node.type}-${index}`;
		switch (node.type) {
			case "text":
				return <span key={key}>{node.text}</span>;
			case "strong":
				return (
					<strong key={key}>
						<Inline nodes={node.children} />
					</strong>
				);
			case "em":
				return (
					<em key={key}>
						<Inline nodes={node.children} />
					</em>
				);
			case "code":
				return <code key={key}>{node.text}</code>;
			case "link":
				return (
					<a
						key={key}
						href={node.href}
						className="automation-link"
						target="_blank"
						rel="noreferrer"
					>
						<Inline nodes={node.children} />
					</a>
				);
			case "image":
				return (
					// eslint-disable-next-line @next/next/no-img-element -- Markdown 本文の確認用
					<img
						key={key}
						src={node.src}
						alt={node.alt}
						className="markdown-preview-image"
						loading="lazy"
					/>
				);
			case "break":
				return <br key={key} />;
		}
	});
}

function Block({ block }: { block: BlockNode }) {
	switch (block.type) {
		case "heading": {
			const Tag = `h${block.level}` as const;
			return (
				<Tag>
					<Inline nodes={block.children} />
				</Tag>
			);
		}
		case "paragraph":
			return (
				<p>
					<Inline nodes={block.children} />
				</p>
			);
		case "quote":
			return (
				<blockquote>
					<Inline nodes={block.children} />
				</blockquote>
			);
		case "list": {
			const Tag = block.ordered ? "ol" : "ul";
			return (
				<Tag
					style={{
						// Tailwind preflight が CSS の list-style を落とすためインラインで戻す
						listStyleType: block.ordered ? "decimal" : "disc",
						listStylePosition: "outside",
					}}
				>
					{block.items.map((item, index) => (
						<li key={index} style={{ listStyle: "inherit" }}>
							<Inline nodes={item} />
						</li>
					))}
				</Tag>
			);
		}
		case "table":
			return (
				<div className="x-schedule-scroll">
					<table className="x-schedule-table">
						<thead>
							<tr>
								{block.headers.map((header, index) => (
									<th key={index}>
										<Inline nodes={header} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row, rowIndex) => (
								<tr key={rowIndex}>
									{row.map((cell, cellIndex) => (
										<td key={cellIndex}>
											<Inline nodes={cell} />
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case "code":
			return (
				<pre>
					<code>{block.text}</code>
				</pre>
			);
		case "hr":
			return <hr />;
	}
}

export function MarkdownPreview({ markdown, className }: Props) {
	const blocks = parseMarkdownPreview(markdown);
	const classes = ["markdown-preview", className].filter(Boolean).join(" ");

	if (blocks.length === 0) {
		return <p className="notes">本文はありません</p>;
	}

	return (
		<div className={classes}>
			{blocks.map((block, index) => (
				<Block key={`${block.type}-${index}`} block={block} />
			))}
		</div>
	);
}
