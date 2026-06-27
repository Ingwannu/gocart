import { json, jsonError, requireUser } from "@/lib/api";
import {
	normalizeCheckoutCouponCode,
	resolveCheckoutCouponBlock,
} from "@/lib/coupon-admin.mjs";
import prisma from "@/lib/prisma";

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { code, totalPrice } = await request.json();
	const requestedCode = normalizeCheckoutCouponCode(code);
	if (!requestedCode) return jsonError("Coupon code is required");

	const coupon = await prisma.coupon.findUnique({
		where: { code: requestedCode },
	});

	const previousOrderCount = coupon?.forNewUser
		? await prisma.order.count({
			where: { userId: user.id },
		})
		: 0;
	const block = resolveCheckoutCouponBlock({
		requestedCode,
		coupon,
		userRole: user.role,
		previousOrderCount,
	});
	if (block) return jsonError(block.message, block.status);

	const subtotal = Number(totalPrice || 0);
	const discountAmount = Number(((coupon.discount / 100) * subtotal).toFixed(2));

	return json({ coupon, discountAmount });
}
