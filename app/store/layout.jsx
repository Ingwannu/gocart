import StoreLayout from "@/components/store/StoreLayout";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveStoreRouteRedirect } from "@/lib/route-guards.mjs";

export const metadata = {
	title: "Wicked Shop - Store Dashboard",
	description: "Wicked Shop - Store Dashboard",
};

export default async function RootAdminLayout({ children }) {
	const session = await getServerSession(authOptions);
	const store = session?.user?.id
		? (await prisma.store.findUnique({
				where: { userId: session.user.id },
				include: { user: true, staffMembers: true },
			})) ||
			await prisma.store.findFirst({
				where: {
					staffMembers: {
						some: { userId: session.user.id, isActive: true },
					},
				},
				include: { user: true, staffMembers: true },
			})
		: null;
	const redirectTo = resolveStoreRouteRedirect(session?.user, store);
	if (redirectTo) redirect(redirectTo);

	return (
		<>
			<StoreLayout>{children}</StoreLayout>
		</>
	);
}
