import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { subscriptionId } = await params;
	const body = await request.json();
	if (typeof body.isActive !== "boolean") {
		return jsonError("Invalid subscription state");
	}

	const subscription = await prisma.$transaction(async (tx) => {
		const updated = await tx.newsletterSubscription.update({
			where: { id: subscriptionId },
			data: {
				isActive: body.isActive,
				unsubscribedAt: body.isActive ? null : new Date(),
			},
		});
		await recordAuditLog(tx, {
			actorId: admin.id,
			action: body.isActive
				? "NEWSLETTER_SUBSCRIPTION_RESTORED"
				: "NEWSLETTER_SUBSCRIPTION_DISABLED",
			targetType: "newsletter_subscription",
			targetId: updated.id,
			summary: `Updated newsletter subscription ${updated.email}`,
			metadata: { email: updated.email, isActive: updated.isActive },
		});
		return updated;
	});

	return json({ subscription });
}
