import { json, jsonError, requireSellerStore } from "@/lib/api";
import prisma from "@/lib/prisma";
import { serializeLicenseKey } from "@/lib/license-key.mjs";

// Seller-scoped license list: every license key issued for products in the
// current seller's store, with buyer + order context for support. Store
// managers (owner or active staff) only; admins use the global order views.
export async function GET(request) {
	const { store, error } = await requireSellerStore();
	if (error) return error;

	const url = new URL(request.url);
	const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
	const q = String(url.searchParams.get("q") || "").trim();

	const where = { product: { storeId: store.id } };
	if (status === "ACTIVE" || status === "REVOKED") where.status = status;
	if (q) {
		where.OR = [
			{ key: { contains: q } },
			{ product: { storeId: store.id, name: { contains: q } } },
			{ user: { email: { contains: q } } },
		];
	}

	const licenses = await prisma.licenseKey.findMany({
		where,
		include: { product: true, user: true, order: true },
		orderBy: { createdAt: "desc" },
		take: 500,
	});

	return json({
		licenses: licenses.map((license) => ({
			...serializeLicenseKey(license),
			orderId: license.orderId,
			buyerEmail: license.user?.email || "",
			buyerName: license.user?.name || "",
		})),
	});
}
