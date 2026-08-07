import {
	createCategory,
	deleteCategory,
	updateCategory,
} from "@/app/actions";
import { colorInputValue } from "@/lib/colors";
import type { Category } from "@/lib/types";

type Props = {
	categories: Category[];
};

export function CategoryManager({ categories }: Props) {
	return (
		<section className="panel">
			<h2>カテゴリ（{categories.length}）</h2>
			<form action={createCategory} className="inline-add-form">
				<input name="name" required placeholder="新しいカテゴリ名" />
				<label className="color-field">
					<span className="sr-only">色</span>
					<input type="color" name="color" defaultValue={colorInputValue("")} />
				</label>
				<button type="submit" className="primary">
					追加
				</button>
			</form>
			{categories.length === 0 ? (
				<p className="empty">カテゴリがありません。</p>
			) : (
				<ul className="master-list">
					{categories.map((category) => (
						<li key={category.id} className="master-item">
							<form action={updateCategory} className="master-edit-form">
								<input type="hidden" name="id" value={category.id} />
								<label>
									<span>名前</span>
									<input name="name" required defaultValue={category.name} />
								</label>
								<label className="color-field">
									<span>色</span>
									<input
										type="color"
										name="color"
										defaultValue={colorInputValue(category.color)}
									/>
								</label>
								<label className="sort-field">
									<span>並び</span>
									<input
										name="sort_order"
										type="number"
										defaultValue={category.sort_order}
									/>
								</label>
								<button type="submit">保存</button>
							</form>
							<form action={deleteCategory}>
								<input type="hidden" name="id" value={category.id} />
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
