import { createTag, deleteTag, updateTag } from "@/app/actions";
import { colorInputValue, tintStyle } from "@/lib/colors";
import type { Tag } from "@/lib/types";

type Props = {
	tags: Tag[];
};

export function TagManager({ tags }: Props) {
	return (
		<section className="panel">
			<h2>タグ（{tags.length}）</h2>
			<form action={createTag} className="inline-add-form">
				<input name="name" required placeholder="新しいタグ名" />
				<label className="color-field">
					<span className="sr-only">色</span>
					<input type="color" name="color" defaultValue={colorInputValue("")} />
				</label>
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
								<label className="color-field">
									<span>色</span>
									<input
										type="color"
										name="color"
										defaultValue={colorInputValue(tag.color)}
									/>
								</label>
								<span className="tag-chip" style={tintStyle(tag.color)}>
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
