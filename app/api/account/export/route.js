import { json, jsonError, requireUser } from "@/lib/api";
import { buildAccountExport } from "@/lib/account-export.mjs";
import prisma from "@/lib/prisma";

export async function GET() {
	const { user, error } = await requireUser();
	if (error) return error;

	const account = await prisma.user.findUnique({
		where: { id: user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			role: true,
			isSuspended: true,
		},
	});
	if (!account || account.isSuspended) return jsonError("Unauthorized", 401);

	const [
		addresses,
		orders,
		ratings,
		returnRequests,
		supportTickets,
		newsletterSubscriptions,
		wishlistItems,
		productQuestions,
	] = await Promise.all([
		prisma.address.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
		}),
		prisma.order.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
			include: {
				address: true,
				store: {
					select: {
						id: true,
						name: true,
						username: true,
						email: true,
					},
				},
				returnRequest: true,
				orderItems: {
					include: {
						product: {
							select: {
								id: true,
								name: true,
								price: true,
								category: true,
								storeId: true,
							},
						},
					},
				},
			},
		}),
		prisma.rating.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
			include: {
				product: {
					select: {
						id: true,
						name: true,
						category: true,
						storeId: true,
					},
				},
			},
		}),
		prisma.returnRequest.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
			include: {
				order: {
					select: {
						id: true,
						total: true,
						status: true,
					},
				},
			},
		}),
		prisma.supportTicket.findMany({
			where: { email: account.email },
			orderBy: { createdAt: "desc" },
		}),
		prisma.newsletterSubscription.findMany({
			where: { email: account.email },
			orderBy: { createdAt: "desc" },
		}),
		prisma.wishlistItem.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
			include: {
				product: {
					select: {
						id: true,
						name: true,
						price: true,
						category: true,
						storeId: true,
					},
				},
			},
		}),
		prisma.productQuestion.findMany({
			where: { userId: account.id },
			orderBy: { createdAt: "desc" },
			include: {
				product: {
					select: {
						id: true,
						name: true,
						price: true,
						category: true,
						storeId: true,
					},
				},
			},
		}),
	]);

	return json({
		export: buildAccountExport({
			user: account,
			addresses,
			orders,
			ratings,
			returnRequests,
			supportTickets,
			newsletterSubscriptions,
			wishlistItems,
			productQuestions,
		}),
	});
}
