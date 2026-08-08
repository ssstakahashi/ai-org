import { createTag, deleteTag, updateTag } from "@/app/actions";
import { colorInputValue, masterTintStyle } from "@/lib/colors";
import type { Tag } from "@/lib/types";

type Props = {
	tags: Tag[];
};

function TagColorFields({
	bgDefault = "",
	textDefault = "",
}: {
	bgDefault?: string;
	textDefault?: string;
}) {
	return (
		<div className="app-master-color-fields">
			<label className="color-field">
				<span className="color-field-label">背景</span>
				<input type="color" name="color" defaultValue={colorInputValue(bgDefault)} />
			</label>
			<label className="color-field">
				<span className="color-field-label">文字</span>
				<input
					type="color"
					name="text_color"
					defaultValue={colorInputValue(textDefault || bgDefault)}
				/>
			</label>
		</div>
	);
}

export function TagManager({ tags }: Props) {
	return (
		<section className="panel">
			<h2>タグ（{tags.length}）</h2>
			<form action={createTag} className="inline-add-form">
				<input name="name" required placeholder="新しいタグ名" />
				<TagColorFields />
				<button type="submit" className="primary">
					追加
				</button>
			</form>
			{tags.length === 0 ? (
				<p className="empty">タグがありません。</p>
			) : (
				<ul className="master-list">
					{tags.map((tag) => (
						<li key={tag.id} className="master-item">
							<form action={updateTag} className="master-edit-form">
								<input type="hidden" name="id" value={tag.id} />
								<label>
									<span>名前</span>
									<input name="name" required defaultValue={tag.name} />
								</label>
								<TagColorFields bgDefault={tag.color} textDefault={tag.text_color} />
								<span className="tag-chip" style={masterTintStyle(tag.color, tag.text_color)}>
									{tag.name}
								</span>
								<button type="submit">保存</button>
							</form>
							<form action={deleteTag}>
								<input type="hidden" name="id" value={tag.id} />
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
