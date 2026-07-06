import { json, jsonError, recordAuditLog, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import { canManageOrderForStore } from "@/lib/order-filters.mjs";
import {
	restoreLicenseKey,
	revokeLicenseKey,
	serializeLicenseKey,
} from "@/lib/license-key.mjs";

const actions = new Set(["revoke", "restore", "unbind"]);

// Store managers (of the owning order's store) and admins can revoke a leaked
// key, restore it, or clear its instance binding so the buyer can re-activate
// on a new server/machine.
export async function PATCH(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { licenseId } = await params;
	const license = await prisma.licenseKey.findUnique({
		where: { id: licenseId },
		include: {
			product: true,
			order: { include: { store: { include: { user: true, staffMembers: true } } } },
		},
	});
	if (!license) return jsonError("License not found", 404);

	if (user.role !== "admin" && !canManageOrderForStore(user, license.order)) {
		return jsonError("Forbidden", 403);
	}

	const body = await request.json();
	const action = String(body?.action || "").trim();
	if (!actions.has(action)) return jsonError("Invalid license action");

	let updated;
	if (action === "revoke") {
		updated = await revokeLicenseKey(licenseId);
	} else {
		updated = await restoreLicenseKey(licenseId, { unbind: action === "unbind" });
	}
	if (!updated) return jsonError("License not found", 404);

	await recordAuditLog(prisma, {
		actorId: user.id,
		action: "LICENSE_KEY_UPDATED",
		targetType: "licenseKey",
		targetId: licenseId,
		summary: `License ${action}: ${updated.key}`,
		metadata: {
			orderId: license.orderId,
			productId: license.productId,
			licenseAction: action,
			status: updated.status,
		},
	});

	return json({ license: serializeLicenseKey({ ...updated, product: license.product }) });
}
