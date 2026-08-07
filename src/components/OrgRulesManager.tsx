import { createOrgRule, deleteOrgRule, updateOrgRule } from "@/app/actions";
import type { OrgRule } from "@/lib/types";

type Props = {
	rules: OrgRule[];
};

export function OrgRulesManager({ rules }: Props) {
	return (
		<section className="panel">
			<h2>組織ルール（{rules.length}）</h2>
			<form action={createOrgRule} className="inline-add-form">
				<input name="title" required placeholder="新しいルールのタイトル" />
				<textarea
					name="body"
					rows={3}
					className="employee-role-textarea"
					placeholder="ルール本文"
					required
				/>
				<label className="tag-option">
					<input type="checkbox" name="is_active" value="1" defaultChecked />
					<span>有効</span>
				</label>
				<button type="submit" className="primary">
					追加
				</button>
			</form>
			{rules.length === 0 ? (
				<p className="empty">組織ルールがありません。上のフォームから追加してください。</p>
			) : (
				<ul className="master-list">
					{rules.map((rule) => (
						<li key={rule.id} className="master-item">
							<form action={updateOrgRule} className="master-edit-form">
								<input type="hidden" name="id" value={rule.id} />
								<label>
									<span>タイトル</span>
									<input name="title" required defaultValue={rule.title} />
								</label>
								<label className="full">
									<span>本文</span>
									<textarea
										name="body"
										rows={4}
										className="employee-role-textarea"
										required
										defaultValue={rule.body}
									/>
								</label>
								<label className="sort-field">
									<span>並び</span>
									<input
										name="sort_order"
										type="number"
										defaultValue={rule.sort_order}
									/>
								</label>
								<label className="tag-option">
									<input
										type="checkbox"
										name="is_active"
										value="1"
										defaultChecked={rule.is_active === 1}
									/>
									<span>有効</span>
								</label>
								<button type="submit">保存</button>
							</form>
							<form action={deleteOrgRule}>
								<input type="hidden" name="id" value={rule.id} />
								<button type="submit" className="ghost">
									削除
								</button>
							</form>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
