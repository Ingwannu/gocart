import { json, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function GET(_request, { params }) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { orderId } = await params;
	const events = await prisma.payoutEvent.findMany({
		where: { orderId },
		include: {
			admin: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					role: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return json({ events });
}
