import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import {
	buildAdminCouponPagination,
	createAdminCouponWhere,
	normalizeAdminCouponPayload,
	resolveCouponWriteError,
} from "@/lib/coupon-admin.mjs";
import prisma from "@/lib/prisma";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createAdminCouponWhere({
		q: searchParams.get("q"),
		audience: searchParams.get("audience"),
		expiry: searchParams.get("expiry"),
	});
	const total = await prisma.coupon.count({ where });
	const pagination = buildAdminCouponPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const coupons = await prisma.coupon.findMany({
		where,
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ coupons, pagination });
}

export async function POST(request) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	let data;
	try {
		data = normalizeAdminCouponPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let coupon;
	try {
		coupon = await prisma.$transaction(async (tx) => {
			const created = await tx.coupon.create({
				data,
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "COUPON_CREATED",
				targetType: "coupon",
				targetId: created.code,
				summary: `Created coupon ${created.code}`,
				metadata: {
					code: created.code,
					discount: created.discount,
					isPublic: created.isPublic,
				},
			});
			return created;
		});
	} catch (error) {
		const writeError = resolveCouponWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ coupon }, { status: 201 });
}
