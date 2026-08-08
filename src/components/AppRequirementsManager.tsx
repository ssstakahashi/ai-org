"use client";

import { useMemo, useState } from "react";
import {
	createAppRequirement,
	deleteAppRequirement,
	updateAppRequirement,
} from "@/app/actions";
import { masterTintStyle } from "@/lib/colors";
import {
	APP_REQUIREMENT_STATUS_LABEL,
	APP_REQUIREMENT_STATUS_OPTIONS,
	formatMasterLabel,
	type AppName,
	type AppRequirementWithApp,
} from "@/lib/types";

type Props = {
	appNames: AppName[];
	requirements: AppRequirementWithApp[];
};

export function AppRequirementsManager({ appNames, requirements }: Props) {
	const [selectedAppId, setSelectedAppId] = useState(
		appNames[0]?.id ?? "",
	);

	const filtered = useMemo(
		() =>
			selectedAppId
				? requirements.filter((item) => item.app_name_id === selectedAppId)
				: [],
		[requirements, selectedAppId],
	);

	const selectedApp = appNames.find((item) => item.id === selectedAppId);

	return (
		<section className="panel">
			<h2>要件定義（{requirements.length}）</h2>
			<p className="panel-lede">
				App ごとに要件を記述します。ステータスが「承認済」の要件は Cursor
				Automation から export できます。
			</p>

			{appNames.length === 0 ? (
				<p className="empty">
					App マスタがありません。先に App タブで App を登録してください。
				</p>
			) : (
				<>
					<div className="view-tabs" role="tablist" aria-label="App の選択">
						{appNames.map((app) => {
							const active = app.id === selectedAppId;
							return (
								<button
									key={app.id}
									type="button"
									role="tab"
									aria-selected={active}
									className={active ? "view-tab active" : "view-tab"}
									style={masterTintStyle(app.color, app.text_color)}
									onClick={() => setSelectedAppId(app.id)}
								>
									{formatMasterLabel(app.name, app.icon)}
								</button>
							);
						})}
					</div>

					{selectedApp ? (
						<form action={createAppRequirement} className="inline-add-form">
							<input type="hidden" name="app_name_id" value={selectedApp.id} />
							<input name="title" required placeholder="新しい要件のタイトル" />
							<textarea
								name="body"
								rows={4}
								className="employee-role-textarea"
								placeholder="要件本文（Markdown 可）"
							/>
							<label>
								<span>ステータス</span>
								<select name="status" defaultValue="draft" aria-label="ステータス">
									{APP_REQUIREMENT_STATUS_OPTIONS.map((status) => (
										<option key={status} value={status}>
											{APP_REQUIREMENT_STATUS_LABEL[status]}
										</option>
									))}
								</select>
							</label>
							<button type="submit" className="primary">
								追加
							</button>
						</form>
					) : null}

					{selectedApp && filtered.length === 0 ? (
						<p className="empty">
							{formatMasterLabel(selectedApp.name, selectedApp.icon)}{" "}
							の要件はまだありません。
						</p>
					) : null}

					{filtered.length > 0 ? (
						<ul className="master-list">
							{filtered.map((item) => (
								<li key={item.id} className="master-item">
									<form action={updateAppRequirement} className="master-edit-form">
										<input type="hidden" name="id" value={item.id} />
										<input
											type="hidden"
											name="app_name_id"
											value={item.app_name_id}
										/>
										<label>
											<span>タイトル</span>
											<input name="title" required defaultValue={item.title} />
										</label>
										<label className="full">
											<span>本文</span>
											<textarea
												name="body"
												rows={6}
												className="employee-role-textarea"
												defaultValue={item.body}
											/>
										</label>
										<label>
											<span>ステータス</span>
											<select
												name="status"
												defaultValue={item.status}
												aria-label="ステータス"
											>
												{APP_REQUIREMENT_STATUS_OPTIONS.map((status) => (
													<option key={status} value={status}>
														{APP_REQUIREMENT_STATUS_LABEL[status]}
													</option>
												))}
											</select>
										</label>
										<label className="sort-field">
											<span>並び</span>
											<input
												name="sort_order"
												type="number"
												defaultValue={item.sort_order}
											/>
										</label>
										<button type="submit">保存</button>
									</form>
									<form action={deleteAppRequirement}>
										<input type="hidden" name="id" value={item.id} />
										<button type="submit" className="ghost">
											削除
										</button>
									</form>
								</li>
							))}
						</ul>
					) : null}
				</>
			)}
		</section>
	);
}
