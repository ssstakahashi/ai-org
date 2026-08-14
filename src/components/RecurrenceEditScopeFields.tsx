"use client";

import { useState } from "react";
import { RECURRENCE_EDIT_SCOPE_LABEL, type RecurrenceEditScope } from "@/lib/types";

type Props = {
	name?: string;
	seriesCount: number;
	futureCount: number;
	mode?: "edit" | "delete";
	defaultScope?: RecurrenceEditScope;
	onScopeChange?: (scope: RecurrenceEditScope) => void;
};

export function RecurrenceEditScopeFields({
	name = "edit_scope",
	seriesCount,
	futureCount,
	mode = "edit",
	defaultScope = "this",
	onScopeChange,
}: Props) {
	const [scope, setScope] = useState<RecurrenceEditScope>(defaultScope);

	if (seriesCount <= 1) return null;

	const legend = mode === "delete" ? "削除の適用範囲" : "編集の適用範囲";

	function handleScopeChange(nextScope: RecurrenceEditScope) {
		setScope(nextScope);
		onScopeChange?.(nextScope);
	}

	return (
		<fieldset className="full recurrence-fieldset recurrence-edit-scope">
			<legend>{legend}</legend>
			<div className="choice-options" role="radiogroup" aria-label={legend}>
				{(["this", "future", "all"] as RecurrenceEditScope[]).map((value) => {
					const countLabel =
						value === "this" ? null : value === "future" ? futureCount : seriesCount;
					return (
						<label key={value} className="choice-option">
							<input
								type="radio"
								name={name}
								value={value}
								checked={scope === value}
								onChange={() => handleScopeChange(value)}
							/>
							<span>
								{RECURRENCE_EDIT_SCOPE_LABEL[value]}
								{countLabel && countLabel > 1 ? `（${countLabel}件）` : null}
							</span>
						</label>
					);
				})}
			</div>
			{mode === "edit" && scope !== "this" ? (
				<p className="field-hint">
					開始・終了日時と画像は「このタスクのみ」のときだけ変更できます。
				</p>
			) : null}
		</fieldset>
	);
}
