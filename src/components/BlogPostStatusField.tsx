import { StatusIcon } from "@/components/StatusIcon";
import {
	BLOG_POST_STATUS_CLASS,
	BLOG_POST_STATUS_ICON,
	BLOG_POST_STATUS_LABEL,
	BLOG_POST_STATUS_OPTIONS,
	type BlogPostStatus,
} from "@/lib/types";

type Props = {
	selectedStatus?: BlogPostStatus;
	defaultStatus?: BlogPostStatus;
	formId?: string;
};

export function BlogPostStatusField({
	selectedStatus,
	defaultStatus = "draft",
	formId,
}: Props) {
	const current = selectedStatus ?? defaultStatus;

	return (
		<div className="status-field full">
			<span>ステータス</span>
			<div className="status-options" role="radiogroup" aria-label="ステータス">
				{BLOG_POST_STATUS_OPTIONS.map((status) => (
					<label
						key={status}
						className={`status-option ${BLOG_POST_STATUS_CLASS[status]}`}
					>
						<input
							type="radio"
							name="status"
							value={status}
							form={formId}
							defaultChecked={status === current}
						/>
						<StatusIcon status={BLOG_POST_STATUS_ICON[status]} />
						<span>{BLOG_POST_STATUS_LABEL[status]}</span>
					</label>
				))}
			</div>
		</div>
	);
}
