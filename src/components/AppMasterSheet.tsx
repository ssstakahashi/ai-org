"use client";

import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { colorInputValue, masterTintStyle } from "@/lib/colors";
import { APP_MASTER_ICONS } from "@/lib/types";

export type AppMasterItem = {
	id: string;
	name: string;
	sort_order: number;
	color?: string;
	text_color?: string;
	icon?: string;
};

type ExtraColumns = {
	headers: readonly string[];
	renderCreate: () => ReactNode;
	renderRow: (item: AppMasterItem, formId: string) => ReactNode;
};

type Props = {
	title: string;
	items: AppMasterItem[];
	addPlaceholder: string;
	nameAriaLabel: string;
	enableColor?: boolean;
	enableIcon?: boolean;
	extraColumns?: ExtraColumns;
	createAction: (formData: FormData) => Promise<void>;
	updateAction: (formData: FormData) => Promise<void>;
	deleteAction: (formData: FormData) => Promise<void>;
	reorderAction: (ids: string[]) => Promise<void>;
};

function withSortOrders<T extends { id: string; sort_order: number }>(items: T[]): T[] {
	return items.map((item, index) => ({
		...item,
		sort_order: (index + 1) * 10,
	}));
}

function IconSelect({
	formId,
	defaultValue = "",
}: {
	formId?: string;
	defaultValue?: string;
}) {
	return (
		<select
			form={formId}
			name="icon"
			defaultValue={defaultValue}
			aria-label="アイコン"
			className="app-master-icon-select"
		>
			<option value="">なし</option>
			{APP_MASTER_ICONS.map((icon) => (
				<option key={icon} value={icon}>
					{icon}
				</option>
			))}
		</select>
	);
}

function ColorFields({
	formId,
	bgDefault = "",
	textDefault = "",
}: {
	formId?: string;
	bgDefault?: string;
	textDefault?: string;
}) {
	return (
		<div className="app-master-color-fields">
			<label className="color-field">
				<span className="color-field-label">背景</span>
				<input
					form={formId}
					type="color"
					name="color"
					defaultValue={colorInputValue(bgDefault)}
				/>
			</label>
			<label className="color-field">
				<span className="color-field-label">文字</span>
				<input
					form={formId}
					type="color"
					name="text_color"
					defaultValue={colorInputValue(textDefault || bgDefault)}
				/>
			</label>
		</div>
	);
}

export function AppMasterSheet({
	title,
	items: initialItems,
	addPlaceholder,
	nameAriaLabel,
	enableColor = false,
	enableIcon = false,
	extraColumns,
	createAction,
	updateAction,
	deleteAction,
	reorderAction,
}: Props) {
	const [items, setItems] = useState(initialItems);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [reordering, setReordering] = useState(false);

	const headers = [
		"並び",
		"名前",
		...(extraColumns?.headers ?? []),
		...(enableIcon ? (["アイコン"] as const) : []),
		...(enableColor ? (["色"] as const) : []),
		"操作",
	];

	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	async function moveItem(sourceId: string, targetId: string) {
		if (sourceId === targetId || reordering) return;

		const fromIndex = items.findIndex((item) => item.id === sourceId);
		const toIndex = items.findIndex((item) => item.id === targetId);
		if (fromIndex < 0 || toIndex < 0) return;

		const next = [...items];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		const ordered = withSortOrders(next);
		setItems(ordered);
		setReordering(true);
		try {
			await reorderAction(ordered.map((item) => item.id));
		} catch (error) {
			setItems(initialItems);
			throw error;
		} finally {
			setReordering(false);
		}
	}

	function onDragStart(event: DragEvent<HTMLButtonElement>, id: string) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", id);
		setDraggingId(id);
	}

	function onDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		if (dropTargetId !== id) setDropTargetId(id);
	}

	async function onDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
		event.preventDefault();
		const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
		setDraggingId(null);
		setDropTargetId(null);
		if (!sourceId) return;
		await moveItem(sourceId, targetId);
	}

	function onDragEnd() {
		setDraggingId(null);
		setDropTargetId(null);
	}

	return (
		<section className="panel">
			<div className="panel-head">
				<h2>
					{title}（{items.length}）
				</h2>
			</div>

			<form action={createAction} className="inline-add-form">
				<input name="name" required placeholder={addPlaceholder} />
				{extraColumns?.renderCreate()}
				{enableIcon ? <IconSelect /> : null}
				{enableColor ? <ColorFields /> : null}
				<button type="submit" className="primary">
					行を追加
				</button>
			</form>

			{items.length === 0 ? (
				<p className="empty">まだ登録がありません。上のフォームから追加してください。</p>
			) : (
				<div className="x-schedule-scroll">
					<p className="field-hint apps-sheet-hint">
						左のハンドルをドラッグして表示順を変更できます。
					</p>
					<table className="x-schedule-table apps-sheet-table">
						<thead>
							<tr>
								{headers.map((header) => (
									<th key={header}>{header}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{items.map((item) => {
								const formId = `app-master-edit-${item.id}`;
								const isDragging = draggingId === item.id;
								const isDropTarget =
									dropTargetId === item.id && draggingId !== item.id;
								return (
									<tr
										key={item.id}
										className={[
											isDragging ? "is-dragging" : "",
											isDropTarget ? "is-drop-target" : "",
										]
											.filter(Boolean)
											.join(" ")}
										onDragOver={(event) => onDragOver(event, item.id)}
										onDrop={(event) => void onDrop(event, item.id)}
										onDragLeave={() => {
											if (dropTargetId === item.id) setDropTargetId(null);
										}}
									>
										<td>
											<button
												type="button"
												className="apps-sheet-drag-handle"
												draggable={!reordering}
												aria-label={`${item.name} を並び替え`}
												title="ドラッグして並び替え"
												onDragStart={(event) => onDragStart(event, item.id)}
												onDragEnd={onDragEnd}
											>
												<span aria-hidden="true">⋮⋮</span>
											</button>
											<form id={formId} action={updateAction}>
												<input type="hidden" name="id" value={item.id} />
											</form>
										</td>
										<td>
											<input
												form={formId}
												name="name"
												required
												defaultValue={item.name}
												aria-label={nameAriaLabel}
												style={
													enableColor
														? masterTintStyle(item.color, item.text_color)
														: undefined
												}
											/>
										</td>
										{extraColumns
											? extraColumns.renderRow(item, formId)
											: null}
										{enableIcon ? (
											<td>
												<IconSelect formId={formId} defaultValue={item.icon ?? ""} />
											</td>
										) : null}
										{enableColor ? (
											<td>
												<ColorFields
													formId={formId}
													bgDefault={item.color ?? ""}
													textDefault={item.text_color ?? ""}
												/>
											</td>
										) : null}
										<td>
											<div className="task-actions">
												<button form={formId} type="submit">
													保存
												</button>
												<form action={deleteAction}>
													<input type="hidden" name="id" value={item.id} />
													<button type="submit" className="ghost">
														削除
													</button>
												</form>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
