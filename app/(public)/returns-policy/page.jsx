import LegalPage from "@/components/LegalPage";
import { getLegalPage } from "@/lib/legal-pages.mjs";

export const metadata = {
	title: "Return and Refund Policy | Wicked Shop",
};

export default function ReturnsPolicyPage() {
	return <LegalPage page={getLegalPage("returns-policy")} />;
}
