import LegalPage from "@/components/LegalPage";
import { getLegalPage } from "@/lib/legal-pages.mjs";

export const metadata = {
	title: "Privacy Policy | Wicked Shop",
};

export default function PrivacyPage() {
	return <LegalPage page={getLegalPage("privacy")} />;
}
