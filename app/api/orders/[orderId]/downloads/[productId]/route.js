import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { canAccessDigitalDownload } from "@/lib/digital-product.mjs";
import { getDownloadGrantsForOrder } from "@/lib/download-grant.mjs";
import prisma from "@/lib/prisma";

// Legacy entry point reached from the orders page. It verifies the buyer paid
// for the item, then redirects to the token-protected download endpoint where
// the grant counter, expiry, and revocation are enforced. This keeps the
// download URL opaque to the buyer while still gating on payment.
export async function GET(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { orderId, productId } = await params;
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			orderItems: {
				include: { product: true },
			},
		},
	});

	const access = canAccessDigitalDownload({ user, order, productId });
	if (!access.ok) return jsonError(access.error, access.status);

	const grants = await getDownloadGrantsForOrder(orderId);
	const grant = grants.find((entry) => entry.productId === productId);
	if (!grant) {
		return jsonError("Download link is not available yet", 404);
	}
	if (grant.revokedAt) return jsonError("Download link has been revoked", 403);

	return NextResponse.redirect(
		new URL(`/api/downloads/${grant.token}`, request.url),
	);
}
