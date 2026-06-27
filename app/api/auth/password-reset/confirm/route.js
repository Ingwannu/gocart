import bcrypt from "bcryptjs";
import { json, jsonError } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	hashPasswordResetToken,
	normalizePasswordResetConfirmPayload,
} from "@/lib/password-reset.mjs";

export async function POST(request) {
	const body = await request.json();
	let payload;
	try {
		payload = normalizePasswordResetConfirmPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const resetToken = await prisma.passwordResetToken.findUnique({
		where: { tokenHash: hashPasswordResetToken(payload.token) },
		include: { user: true },
	});
	if (
		!resetToken ||
		resetToken.usedAt ||
		resetToken.expiresAt < new Date() ||
		resetToken.user.isSuspended
	) {
		return jsonError("Reset token is invalid or expired", 400);
	}

	const password = await bcrypt.hash(payload.password, 10);
	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: resetToken.userId },
			data: { password },
		});
		await tx.passwordResetToken.update({
			where: { id: resetToken.id },
			data: { usedAt: new Date() },
		});
		await tx.passwordResetToken.updateMany({
			where: {
				userId: resetToken.userId,
				id: { not: resetToken.id },
				usedAt: null,
			},
			data: { usedAt: new Date() },
		});
	});

	return json({ ok: true });
}
