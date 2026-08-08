import Link from "next/link";
import { createPage, deletePage, updatePage } from "@/app/actions";
import { tintStyle } from "@/lib/colors";
import type { Category, PageWithCategory, Tag } from "@/lib/types";

type Props = {
	pages: PageWithCategory[];
	categories: Category[];
	tags: Tag[];
};

function groupPagesByTag(pages: PageWithCategory[], tags: Tag[]) {
	const groups = tags.map((tag) => ({
		tag,
		pages: pages.filter((page) => page.tags.some((item) => item.id === tag.id)),
	}));
	const untagged = pages.filter((page) => page.tags.length === 0);
	return { groups, untagged };
}

function PageTagFields({
	page,
	tags,
}: {
	page?: PageWithCategory;
	tags: Tag[];
}) {
	const selectedTagIds = new Set(page?.tags.map((tag) => tag.id) ?? []);

	return (
		<fieldset className="tag-fieldset">
			<legend>タグ</legend>
			{tags.length > 0 ? (
				<div className="tag-options">
					{tags.map((tag) => (
						<label key={tag.id} className="tag-option" style={tintStyle(tag.color)}>
							<input
								type="checkbox"
								name="tag_ids"
								value={tag.id}
								defaultChecked={selectedTagIds.has(tag.id)}
							/>
							<span>{tag.name}</span>
						</label>
					))}
				</div>
			) : (
				<p className="field-hint">まだタグがありません。タグタブで追加するか、下の欄で新規作成できます。</p>
			)}
			<label className="new-tag-field">
				<span>新規タグ（カンマ区切りで追加）</span>
				<input name="new_tags" placeholder="例: ナビ, マスタ" />
			</label>
		</fieldset>
	);
}

function PageCategoryField({
	page,
	categories,
}: {
	page?: PageWithCategory;
	categories: Category[];
}) {
	const selectedCategoryId = page?.category_id ?? "";

	return (
		<div className="choice-field full">
			<span>カテゴリ</span>
			<div className="choice-options" role="radiogroup" aria-label="カテゴリ">
				<label className="choice-option">
					<input
						type="radio"
						name="category_id"
						value=""
						defaultChecked={!selectedCategoryId}
					/>
					<span>未分類</span>
				</label>
				{categories.map((category) => (
					<label
						key={category.id}
						className="choice-option"
						style={tintStyle(category.color)}
					>
						<input
							type="radio"
							name="category_id"
							value={category.id}
							defaultChecked={category.id === selectedCategoryId}
						/>
						<span>{category.name}</span>
					</label>
				))}
			</div>
		</div>
	);
}

function PageCard({ page }: { page: PageWithCategory }) {
	return (
		<article className="page-card">
			<div className="page-card-head">
				<h3>{page.title}</h3>
				{page.path ? (
					<Link href={page.path} className="page-card-path">
						{page.path}
					</Link>
				) : (
					<span className="page-card-path muted">パス未設定</span>
				)}
			</div>
			{page.body ? <p className="page-card-body">{page.body}</p> : null}
			<div className="page-card-meta">
				{page.category_name ? (
					<span className="tag-chip" style={tintStyle(page.category_color)}>
						{page.category_name}
					</span>
				) : null}
				{page.tags.map((tag) => (
					<span key={tag.id} className="tag-chip" style={tintStyle(tag.color)}>
						{tag.name}
					</span>
				))}
			</div>
		</article>
	);
}

export function PageManager({ pages, categories, tags }: Props) {
	const { groups, untagged } = groupPagesByTag(pages, tags);

	return (
		<>
			<section className="panel">
				<h2>新規ページ</h2>
				<form action={createPage} className="page-form">
					<div className="form-grid">
						<label className="full">
							<span>タイトル</span>
							<input name="title" required placeholder="例: 業務台帳" />
						</label>
						<label className="full">
							<span>パス</span>
							<input name="path" placeholder="例: /apps" />
						</label>
						<label className="full">
							<span>説明</span>
							<textarea name="body" rows={2} placeholder="ページの概要" />
						</label>
						<PageCategoryField categories={categories} />
						<PageTagFields tags={tags} />
					</div>
					<button type="submit" className="primary">
						追加
					</button>
				</form>
			</section>

			<section className="panel">
				<h2>タグ別一覧（{pages.length}）</h2>
				{pages.length === 0 ? (
					<p className="empty">ページがありません。上のフォームから追加してください。</p>
				) : (
					<div className="page-tag-groups">
						{groups.map(({ tag, pages: taggedPages }) =>
							taggedPages.length === 0 ? null : (
								<section key={tag.id} className="page-tag-group">
									<h3>
										<span className="tag-chip" style={tintStyle(tag.color)}>
											{tag.name}
										</span>
										<span className="page-tag-count">{taggedPages.length}</span>
									</h3>
									<div className="page-card-grid">
										{taggedPages.map((page) => (
											<PageCard key={`${tag.id}-${page.id}`} page={page} />
										))}
									</div>
								</section>
							),
						)}
						{untagged.length > 0 ? (
							<section className="page-tag-group">
								<h3>
									<span className="tag-chip">タグなし</span>
									<span className="page-tag-count">{untagged.length}</span>
								</h3>
								<div className="page-card-grid">
									{untagged.map((page) => (
										<PageCard key={page.id} page={page} />
									))}
								</div>
							</section>
						) : null}
					</div>
				)}
			</section>

			<section className="panel">
				<h2>編集</h2>
				{pages.length === 0 ? (
					<p className="empty">編集対象のページがありません。</p>
				) : (
					<ul className="master-list">
						{pages.map((page) => (
							<li key={page.id} className="master-item">
								<form action={updatePage} className="master-edit-form page-edit-form">
									<input type="hidden" name="id" value={page.id} />
									<label>
										<span>タイトル</span>
										<input name="title" required defaultValue={page.title} />
									</label>
									<label>
										<span>パス</span>
										<input name="path" defaultValue={page.path} />
									</label>
									<label className="full">
										<span>説明</span>
										<textarea name="body" rows={2} defaultValue={page.body} />
									</label>
									<label className="sort-field">
										<span>並び</span>
										<input
											name="sort_order"
											type="number"
											defaultValue={page.sort_order}
										/>
									</label>
									<PageCategoryField page={page} categories={categories} />
									<PageTagFields page={page} tags={tags} />
									<button type="submit">保存</button>
								</form>
								<form action={deletePage}>
									<input type="hidden" name="id" value={page.id} />
									<button type="submit" className="ghost">
										削除
									</button>
								</form>
							</li>
						))}
					</ul>
				)}
			</section>
		</>
	);
}
