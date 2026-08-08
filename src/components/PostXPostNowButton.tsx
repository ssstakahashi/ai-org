"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { postXPostNow } from "@/app/actions";
import {
	recoverFromStaleServerAction,
	STALE_SERVER_ACTION_MESSAGE,
} from "@/lib/server-action-client";

type Props = {
	postId: string;
	onMessage: (message: string | null) => void;
	children: ReactNode;
};

export function PostXPostNowButton({ postId, onMessage, children }: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	return (
		<button
			type="button"
			className="x-schedule-action-btn x-action-post"
			disabled={pending}
			onClick={() => {
				onMessage(null);
				startTransition(async () => {
					try {
						const formData = new FormData();
						formData.set("id", postId);
						await postXPostNow(formData);
						onMessage("Xへ投稿しました");
						router.refresh();
					} catch (error) {
						if (recoverFromStaleServerAction(error)) return;
						onMessage(
							error instanceof Error ? error.message : String(error),
						);
					}
				});
			}}
		>
			{pending ? "投稿中…" : children}
		</button>
	);
}
