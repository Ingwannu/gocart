import { Noto_Sans_KR } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import AuthProvider from "@/components/AuthProvider";
import { PublicSettingsProvider } from "@/components/PublicSettingsProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

export const metadata = {
	title: "Wicked Shop - Minecraft plugins, websites, and bots",
	description:
		"Digital marketplace for Minecraft server plugins, server packs, website source, Discord bots, and creator bundles.",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className={`${notoSansKr.className} antialiased`}>
				<LanguageProvider>
					<AuthProvider>
						<PublicSettingsProvider>
							<StoreProvider>
								<Toaster />
								{children}
							</StoreProvider>
						</PublicSettingsProvider>
					</AuthProvider>
				</LanguageProvider>
			</body>
		</html>
	);
}
