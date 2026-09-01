import type { Metadata } from "next";
import { headers } from "next/headers";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { AppTopNav } from "@/components/AppTopNav";
import "./globals.css";

const mPlusRounded = M_PLUS_Rounded_1c({
	variable: "--font-body",
	weight: ["400", "500", "700"],
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "ai-org | 業務台帳",
	description: "AI従業員のタスクと成果物を管理する司令塔",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const headerList = await headers();
	const pathname = headerList.get("x-pathname") ?? "";
	const showNav = pathname !== "/login";

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
