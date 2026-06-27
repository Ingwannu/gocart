import LegalPage from "@/components/LegalPage";
import { getLegalPage } from "@/lib/legal-pages.mjs";

export const metadata = {
	title: "Terms of Service | Wicked Shop",
};

export default function TermsPage() {
	return <LegalPage page={getLegalPage("terms")} />;
}
