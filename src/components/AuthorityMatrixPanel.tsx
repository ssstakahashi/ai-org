"use client";

import { useRouter } from "next/navigation";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type DragEvent,
	type ReactNode,
} from "react";
import { updateOrgRuleBody } from "@/app/actions";
import {
	AUTHORITY_SECTION_HEADING,
	extractSectionTable,
	parseMarkdownBlocks,
	replaceSectionTable,
	type AuthorityEditableSection,
	type MarkdownTable,
} from "@/lib/authority-markdown";
import type { OrgRule } from "@/lib/types";

type Props = {
	rule: OrgRule;
};

type DraftRow = {
	key: string;
	cells: string[];
};

type DraftTable = {
	headers: string[];
	rows: DraftRow[];
};

function newRowKey() {
	return crypto.randomUUID();
}

function toDraftTable(table: MarkdownTable): DraftTable {
	return {
		headers: [...table.headers],
		rows: table.rows.map((cells) => ({
			key: newRowKey(),
			cells: [...cells],
		})),
	};
}

function emptyTermsDraft(): DraftTable {
	return toDraftTable({ headers: ["用語", "定義"], rows: [["", ""]] });
}

export function AuthorityMatrixPanel({ rule }: Props) {
	const router = useRouter();
	const termsDialogRef = useRef<HTMLDialogElement>(null);
	const matrixDialogRef = useRef<HTMLDialogElement>(null);
	const [body, setBody] = useState(rule.body);
	const [editingSection, setEditingSection] =
		useState<AuthorityEditableSection | null>(null);
	const [draftTable, setDraftTable] = useState<DraftTable | null>(null);
	const [formKey, setFormKey] = useState(0);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

	useEffect(() => {
		setBody(rule.body);
	}, [rule.body]);

	const blocks = parseMarkdownBlocks(body).filter(
		(block) =>
			!(block.type === "heading" && block.level === 1 && block.text === rule.title),
	);

	const closeDialog = useCallback((section: AuthorityEditableSection) => {
		const dialog =
			section === "terms" ? termsDialogRef.current : matrixDialogRef.current;
		dialog?.close();
		setEditingSection(null);
		setDraftTable(null);
		setError(null);
		setDraggingKey(null);
		setDropTargetKey(null);
	}, []);

	function openSectionEditor(section: AuthorityEditableSection) {
		const heading = AUTHORITY_SECTION_HEADING[section];
		const table = extractSectionTable(body, heading);
		setDraftTable(
			table
				? toDraftTable(table)
				: section === "terms"
					? emptyTermsDraft()
					: toDraftTable({ headers: ["業務区分"], rows: [[""]] }),
		);
		setEditingSection(section);
		setFormKey((value) => value + 1);
		setError(null);
		setDraggingKey(null);
		setDropTargetKey(null);
		const dialog =
			section === "terms" ? termsDialogRef.current : matrixDialogRef.current;
		dialog?.showModal();
	}

	function updateCell(rowKey: string, cellIndex: number, value: string) {
		setDraftTable((current) => {
			if (!current) return current;
			return {
				...current,
				rows: current.rows.map((row) => {
					if (row.key !== rowKey) return row;
					const cells = [...row.cells];
					cells[cellIndex] = value;
					return { ...row, cells };
				}),
			};
		});
	}

	function updateHeader(cellIndex: number, value: string) {
		setDraftTable((current) => {
			if (!current) return current;
			const headers = [...current.headers];
			headers[cellIndex] = value;
			return { ...current, headers };
		});
	}

	function addRow() {
		setDraftTable((current) => {
			if (!current) return current;
			const blank = current.headers.map(() => "");
			return {
				...current,
				rows: [...current.rows, { key: newRowKey(), cells: blank }],
			};
		});
	}

	function removeRow(rowKey: string) {
		setDraftTable((current) => {
			if (!current) return current;
			if (current.rows.length <= 1) return current;
			return {
				...current,
				rows: current.rows.filter((row) => row.key !== rowKey),
			};
		});
	}

	function moveRow(sourceKey: string, targetKey: string) {
		if (sourceKey === targetKey) return;
		setDraftTable((current) => {
			if (!current) return current;
			const fromIndex = current.rows.findIndex((row) => row.key === sourceKey);
			const toIndex = current.rows.findIndex((row) => row.key === targetKey);
			if (fromIndex < 0 || toIndex < 0) return current;
			const next = [...current.rows];
			const [moved] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, moved);
			return { ...current, rows: next };
		});
	}

	function onRowDragStart(event: DragEvent<HTMLButtonElement>, key: string) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", key);
		setDraggingKey(key);
	}

	function onRowDragOver(event: DragEvent<HTMLTableRowElement>, key: string) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetKey !== key) setDropTargetKey(key);
	}

	function onRowDrop(event: DragEvent<HTMLTableRowElement>, targetKey: string) {
		event.preventDefault();
		const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
		setDraggingKey(null);
		setDropTargetKey(null);
		if (!sourceKey) return;
		moveRow(sourceKey, targetKey);
	}

	function onRowDragEnd() {
		setDraggingKey(null);
		setDropTargetKey(null);
	}

	async function saveSection(section: AuthorityEditableSection) {
		if (!draftTable) return;
		const heading = AUTHORITY_SECTION_HEADING[section];
		const cleanedRows = draftTable.rows
			.map((row) => row.cells)
			.filter((row) => row.some((cell) => cell.trim().length > 0));
		if (cleanedRows.length === 0) {
			setError(`${heading} に1行以上入力してください`);
			return;
		}

		const nextBody = replaceSectionTable(body, heading, {
			headers: draftTable.headers,
			rows: cleanedRows,
		});

		const formData = new FormData();
		formData.set("id", rule.id);
		formData.set("body", nextBody);

		setSaving(true);
		setError(null);
		try {
			await updateOrgRuleBody(formData);
			setBody(nextBody);
			closeDialog(section);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "保存に失敗しました");
		} finally {
			setSaving(false);
		}
	}

	function renderEditorRows(kind: "terms" | "matrix") {
		if (!draftTable) return null;

		return draftTable.rows.map((row, rowIndex) => {
			const isDragging = draggingKey === row.key;
			const isDropTarget =
				dropTargetKey === row.key && draggingKey !== row.key;
			return (
				<tr
					key={row.key}
					className={[
						isDragging ? "is-dragging" : "",
						isDropTarget ? "is-drop-target" : "",
					]
						.filter(Boolean)
						.join(" ")}
					onDragOver={(event) => onRowDragOver(event, row.key)}
					onDrop={(event) => onRowDrop(event, row.key)}
					onDragLeave={() => {
						if (dropTargetKey === row.key) setDropTargetKey(null);
					}}
				>
					<td>
						<button
							type="button"
							className="apps-sheet-drag-handle"
							draggable
							aria-label={`${rowIndex + 1} 行目を並び替え`}
							title="ドラッグして並び替え"
							onDragStart={(event) => onRowDragStart(event, row.key)}
							onDragEnd={onRowDragEnd}
						>
							<span aria-hidden="true">⋮⋮</span>
						</button>
					</td>
					{kind === "terms"
						? row.cells.map((cell, cellIndex) => (
								<td key={`${row.key}-${cellIndex}`}>
									{cellIndex === 0 ? (
										<input
											aria-label={`用語 ${rowIndex + 1}`}
											value={cell}
											onChange={(event) =>
												updateCell(row.key, cellIndex, event.target.value)
											}
											required
										/>
									) : (
										<textarea
											aria-label={`定義 ${rowIndex + 1}`}
											rows={2}
											className="employee-role-textarea"
											value={cell}
											onChange={(event) =>
												updateCell(row.key, cellIndex, event.target.value)
											}
											required
										/>
									)}
								</td>
							))
						: draftTable.headers.map((_, cellIndex) => (
								<td key={`${row.key}-${cellIndex}`}>
									<input
										aria-label={`${draftTable.headers[cellIndex] ?? "セル"} ${rowIndex + 1}`}
										value={row.cells[cellIndex] ?? ""}
										onChange={(event) =>
											updateCell(row.key, cellIndex, event.target.value)
										}
									/>
								</td>
							))}
					<td>
						<button
							type="button"
							className="ghost"
							onClick={() => removeRow(row.key)}
							disabled={draftTable.rows.length <= 1}
						>
							削除
						</button>
					</td>
				</tr>
			);
		});
	}

	let pendingHeading: string | null = null;

	return (
		<>
			<section className="panel">
				<div className="panel-head">
					<h2>{rule.title}</h2>
				</div>
				<div className="master-grid">
					{blocks.map((block, blockIndex) => {
						const key = `${block.type}-${blockIndex}`;

						if (block.type === "heading") {
							pendingHeading = block.text;
							const editable =
								block.text === AUTHORITY_SECTION_HEADING.terms
									? ("terms" as const)
									: block.text === AUTHORITY_SECTION_HEADING.matrix
										? ("matrix" as const)
										: null;

							return (
								<div key={key} className="panel-head">
									<h2>{block.text}</h2>
									{editable ? (
										<button
											type="button"
											onClick={() => openSectionEditor(editable)}
										>
											編集
										</button>
									) : null}
								</div>
							);
						}

						if (block.type === "quote") {
							return (
								<p key={key} className="field-hint">
									{block.text}
								</p>
							);
						}

						if (block.type === "list") {
							return (
								<ul key={key} className="master-list">
									{block.items.map((item) => (
										<li key={item} className="master-item master-item-simple">
											<p className="employee-card-role">{item}</p>
										</li>
									))}
								</ul>
							);
						}

						if (block.type === "table") {
							const sectionLabel = pendingHeading;
							pendingHeading = null;
							return (
								<div key={key} className="x-schedule-scroll">
									<table
										className="x-schedule-table"
										aria-label={sectionLabel ?? "表"}
									>
										<thead>
											<tr>
												{block.headers.map((header) => (
													<th key={header}>{header}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{block.rows.map((row) => (
												<tr key={row.join("|")}>
													{row.map((cell, cellIndex) => (
														<td key={`${cell}-${cellIndex}`}>{cell}</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							);
						}

						return (
							<p key={key} className="employee-card-role">
								{block.text}
							</p>
						);
					})}
				</div>
			</section>

			<dialog
				ref={termsDialogRef}
				className="task-dialog task-dialog-docked"
				onClose={() => {
					setEditingSection(null);
					setDraftTable(null);
					setError(null);
					setDraggingKey(null);
					setDropTargetKey(null);
				}}
				onClick={(event) => {
					if (event.target === termsDialogRef.current) closeDialog("terms");
				}}
			>
				<div className="task-dialog-panel task-dialog-panel-docked">
					<div className="task-dialog-head">
						<h2>用語定義を編集</h2>
						<button
							type="button"
							className="ghost"
							onClick={() => closeDialog("terms")}
						>
							閉じる
						</button>
					</div>
					{editingSection === "terms" && draftTable ? (
						<form
							key={`terms-${formKey}`}
							className="employee-edit-form employee-dialog-form task-dialog-form-docked"
							onSubmit={(event) => {
								event.preventDefault();
								void saveSection("terms");
							}}
						>
							{error ? <p className="empty">{error}</p> : null}
							<p className="field-hint">
								左のハンドルをドラッグして表示順を変更できます。
							</p>
							<div className="x-schedule-scroll task-dialog-scroll">
								<table className="x-schedule-table">
									<thead>
										<tr>
											<th>表示順</th>
											{draftTable.headers.map((header, headerIndex) => (
												<th key={`terms-h-${headerIndex}`}>
													<input
														aria-label={`見出し ${headerIndex + 1}`}
														value={header}
														onChange={(event) =>
															updateHeader(headerIndex, event.target.value)
														}
														required
													/>
												</th>
											))}
											<th>操作</th>
										</tr>
									</thead>
									<tbody>{renderEditorRows("terms")}</tbody>
								</table>
							</div>
							<div className="task-actions task-dialog-footer">
								<button type="button" onClick={addRow}>
									行を追加
								</button>
								<button type="submit" className="primary" disabled={saving}>
									{saving ? "保存中…" : "保存"}
								</button>
							</div>
						</form>
					) : null}
				</div>
			</dialog>

			<dialog
				ref={matrixDialogRef}
				className="task-dialog task-dialog-docked"
				onClose={() => {
					setEditingSection(null);
					setDraftTable(null);
					setError(null);
					setDraggingKey(null);
					setDropTargetKey(null);
				}}
				onClick={(event) => {
					if (event.target === matrixDialogRef.current) closeDialog("matrix");
				}}
			>
				<div className="task-dialog-panel task-dialog-panel-docked">
					<div className="task-dialog-head">
						<h2>職位別権限マトリクスを編集</h2>
						<button
							type="button"
							className="ghost"
							onClick={() => closeDialog("matrix")}
						>
							閉じる
						</button>
					</div>
					{editingSection === "matrix" && draftTable ? (
						<form
							key={`matrix-${formKey}`}
							className="employee-edit-form employee-dialog-form task-dialog-form-docked"
							onSubmit={(event) => {
								event.preventDefault();
								void saveSection("matrix");
							}}
						>
							{error ? <p className="empty">{error}</p> : null}
							<p className="field-hint">
								左のハンドルをドラッグして表示順を変更できます。
							</p>
							<div className="x-schedule-scroll task-dialog-scroll">
								<table className="x-schedule-table">
									<thead>
										<tr>
											<th>表示順</th>
											{draftTable.headers.map((header, headerIndex) => (
												<th key={`matrix-h-${headerIndex}`}>
													<input
														aria-label={`列 ${headerIndex + 1}`}
														value={header}
														onChange={(event) =>
															updateHeader(headerIndex, event.target.value)
														}
														required
													/>
												</th>
											))}
											<th>操作</th>
										</tr>
									</thead>
									<tbody>{renderEditorRows("matrix")}</tbody>
								</table>
							</div>
							<div className="task-actions task-dialog-footer">
								<button type="button" onClick={addRow}>
									行を追加
								</button>
								<button type="submit" className="primary" disabled={saving}>
									{saving ? "保存中…" : "保存"}
								</button>
							</div>
						</form>
					) : null}
				</div>
			</dialog>
		</>
	);
}

export function AuthorityEmptyPanel({ children }: { children: ReactNode }) {
	return (
		<section className="panel">
			<h2>職務権限</h2>
			<p className="empty">{children}</p>
		</section>
	);
}
