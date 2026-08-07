"use client";

import { useState } from "react";
import { RECURRENCE_MAX, WEEKDAY_LABELS, type RecurrenceKind } from "@/lib/recurrence";

export function RecurrenceFields() {
	const [kind, setKind] = useState<RecurrenceKind>("none");

	return (
		<fieldset className="full recurrence-fieldset">
			<legend>繰り返し</legend>
			<label>
				<span>頻度</span>
				<select
					name="recurrence"
					value={kind}
					onChange={(event) => setKind(event.target.value as RecurrenceKind)}
				>
					<option value="none">なし（1件だけ）</option>
					<option value="daily">毎日</option>
					<option value="weekly">毎週（曜日指定）</option>
					<option value="monthly">毎月（同じ日付）</option>
				</select>
			</label>

			{kind === "weekly" ? (
				<div className="weekday-options">
					<p className="field-hint">繰り返す曜日（未選択時は開始日の曜日）</p>
					<div className="tag-options">
						{WEEKDAY_LABELS.map((label, day) => (
							<label key={label} className="tag-option">
								<input type="checkbox" name="weekdays" value={day} />
								<span>{label}</span>
							</label>
						))}
					</div>
				</div>
			) : null}

			{kind !== "none" ? (
				<div className="recurrence-limits">
					<label>
						<span>終了日</span>
						<input type="date" name="recur_until" />
					</label>
					<label>
						<span>回数</span>
						<input
							type="number"
							name="recur_count"
							min={1}
							max={RECURRENCE_MAX}
							placeholder={`例: 10（最大 ${RECURRENCE_MAX}）`}
						/>
					</label>
					<p className="field-hint">
						終了日と回数の両方を指定した場合は、先に達した方で止めます。開始が必須です。
					</p>
				</div>
			) : null}
		</fieldset>
	);
}
