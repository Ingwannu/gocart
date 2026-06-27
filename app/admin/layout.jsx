import AdminLayout from "@/components/admin/AdminLayout";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { resolveAdminRouteRedirect } from "@/lib/route-guards.mjs";

export const metadata = {
	title: "Wicked Shop - Admin",
	description: "Wicked Shop - Admin",
};

export default async function RootAdminLayout({ children }) {
	const session = await getServerSession(authOptions);
	const redirectTo = resolveAdminRouteRedirect(session?.user);
	if (redirectTo) redirect(redirectTo);

	return (
		<>
			<AdminLayout>{children}</AdminLayout>
		</>
	);
}
