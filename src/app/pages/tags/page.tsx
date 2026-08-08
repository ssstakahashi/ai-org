import { listTags } from "@/app/actions";
import { TagManager } from "@/components/TagManager";

export const dynamic = "force-dynamic";

export default async function PageTagsPage() {
	const tags = await listTags();

	return <TagManager tags={tags} />;
}
