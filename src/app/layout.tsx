import type { Metadata } from "next";
import { headers } from "next/headers";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { AppTopNav } from "@/components/AppTopNav";
import { requestHasAppSession } from "@/lib/request-session";
import "./globals.css";

const mPlusRounded = M_PLUS_Rounded_1c({
	variable: "--font-body",
	weight: ["400", "500", "700"],
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "ai-org | 業務台帳",
	description:
		"人と AI 従業員の業務タスクを管理する社内の業務台帳です。ログインしなくても、アプリの目的とデータの取り扱いを確認できます。",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const headerList = await headers();
	const pathname = headerList.get("x-pathname") ?? "";
	const signedIn = await requestHasAppSession();
	const showNav =
		signedIn &&
		pathname !== "/login" &&
		pathname !== "/privacy" &&
		pathname !== "/privacy-policy" &&
		pathname !== "/about" &&
		pathname !== "/terms";

	return (
		<html lang="ja">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body
				className={`${mPlusRounded.variable} antialiased`}
				suppressHydrationWarning
			>
				{showNav ? <AppTopNav logoutHref="/api/auth/logout" /> : null}
				{children}
			</body>
		</html>
	);
}
