import {
	json,
	jsonError,
	parseReturnRequest,
	recordAuditLog,
	requireAdmin,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeAdminReturnRequestPatchPayload,
	resolveReturnRequestWriteError,
} from "@/lib/return-request.mjs";
import { revokeOrderDownloadGrants } from "@/lib/download-grant.mjs";
import { revokeOrderLicenseKeys } from "@/lib/license-key.mjs";

const returnRequestInclude = {
	user: true,
	order: {
		include: {
			store: true,
			address: true,
			orderItems: { include: { product: { include: { store: true, rating: true } } } },
		},
	},
};

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { requestId } = await params;
	const body = await request.json();
	let data;
	try {
		data = normalizeAdminReturnRequestPatchPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}
	if (Object.keys(data).length === 0) {
		return jsonError("No return request fields to update");
	}

	let updated;
	try {
		updated = await prisma.$transaction(async (tx) => {
			const request = await tx.returnRequest.update({
				where: { id: requestId },
				data,
				include: returnRequestInclude,
			});
			// A refunded buyer must not keep working download links or license
			// keys for the refunded digital goods.
			if (request.status === "REFUNDED") {
				await revokeOrderDownloadGrants(request.orderId, tx);
				await revokeOrderLicenseKeys(request.orderId, tx);
			}
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "RETURN_REQUEST_UPDATED",
				targetType: "returnRequest",
				targetId: request.id,
				summary: `Updated return request ${request.id}`,
				metadata: {
					orderId: request.orderId,
					status: request.status,
					refundAmount: request.refundAmount,
					resolutionNote: request.resolutionNote,
				},
			});
			return request;
		});
	} catch (error) {
		const writeError = resolveReturnRequestWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ request: parseReturnRequest(updated) });
}
