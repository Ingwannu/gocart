import { json, jsonError, requireUser, recordAuditLog } from "@/lib/api";
import prisma from "@/lib/prisma";
import { canManageOrderForStore } from "@/lib/order-filters.mjs";
import { revokeDownloadGrant, reissueDownloadGrant } from "@/lib/download-grant.mjs";

async function resolveGrantForActor(grantId, user) {
	const grant = await prisma.downloadGrant.findUnique({
		where: { id: grantId },
		include: {
			order: { include: { store: { include: { user: true, staffMembers: true } } } },
			product: true,
		},
	});
	if (!grant) return { error: jsonError("Grant not found", 404) };
	if (!canManageOrderForStore(user, grant.order)) {
		return { error: jsonError("Forbidden", 403) };
	}
	return { grant };
}

export async function POST(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { grantId } = await params;
	const { grant, error: grantError } = await resolveGrantForActor(grantId, user);
	if (grantError) return grantError;

	const body = await request.json().catch(() => ({}));
	const action = String(body.action || "").toLowerCase();

	let updated;
	let actionLabel;
	if (action === "revoke") {
		updated = await revokeDownloadGrant(grantId);
		actionLabel = "DOWNLOAD_GRANT_REVOKED";
	} else if (action === "reissue") {
		updated = await reissueDownloadGrant(grantId);
		actionLabel = "DOWNLOAD_GRANT_REISSUED";
	} else {
		return jsonError("Invalid action; use 'revoke' or 'reissue'");
	}

	if (!updated) return jsonError("Grant could not be updated", 404);

	await recordAuditLog(prisma, {
		actorId: user.id,
		action: actionLabel,
		targetType: "download_grant",
		targetId: grantId,
		summary: `${actionLabel.replace("DOWNLOAD_GRANT_", "")} grant for order ${grant.orderId}`,
		metadata: { orderId: grant.orderId, productId: grant.productId },
	});

	return json({ grant: serializeGrant(updated) });
}

export function serializeGrant(grant) {
	if (!grant) return null;
	return {
		id: grant.id,
		token: grant.token,
		orderId: grant.orderId,
		productId: grant.productId,
		userId: grant.userId,
		maxDownloads: grant.maxDownloads,
		downloadCount: grant.downloadCount,
		expiresAt: grant.expiresAt,
		revokedAt: grant.revokedAt,
		createdAt: grant.createdAt,
		updatedAt: grant.updatedAt,
	};
}
