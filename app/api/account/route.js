import bcrypt from "bcryptjs";
import {
	json,
	jsonError,
	recordAuditLog,
	requireUser,
	sanitizeUser,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeAccountPasswordPayload,
	normalizeAccountProfilePayload,
	resolveAccountWriteError,
} from "@/lib/account.mjs";

export async function GET() {
	const { user, error } = await requireUser();
	if (error) return error;

	const account = await prisma.user.findUnique({
		where: { id: user.id },
	});
	if (!account) return jsonError("Unauthorized", 401);

	return json({ user: sanitizeUser(account) });
}

export async function PATCH(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let profileData;
	try {
		profileData = normalizeAccountProfilePayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const wantsPasswordChange =
		body.currentPassword !== undefined || body.newPassword !== undefined;
	let passwordData = null;
	if (wantsPasswordChange) {
		try {
			passwordData = normalizeAccountPasswordPayload(body);
		} catch (error) {
			return jsonError(error.message);
		}
	}

	const existing = await prisma.user.findUnique({ where: { id: user.id } });
	if (!existing || existing.isSuspended) return jsonError("Unauthorized", 401);

	const updateData = { ...profileData };
	if (passwordData) {
		const matches = await bcrypt.compare(
			passwordData.currentPassword,
			existing.password,
		);
		if (!matches) return jsonError("Current password is incorrect", 403);
		updateData.password = await bcrypt.hash(passwordData.newPassword, 10);
	}

	let account;
	try {
		account = await prisma.$transaction(async (tx) => {
			const updated = await tx.user.update({
				where: { id: user.id },
				data: updateData,
			});
			const fields = Object.keys(profileData);
			if (fields.length) {
				await recordAuditLog(tx, {
					actorId: user.id,
					action: "ACCOUNT_UPDATED",
					targetType: "user",
					targetId: user.id,
					summary: `Updated account ${updated.email}`,
					metadata: { fields, email: updated.email },
				});
			}
			if (passwordData) {
				await recordAuditLog(tx, {
					actorId: user.id,
					action: "PASSWORD_CHANGED",
					targetType: "user",
					targetId: user.id,
					summary: `Changed password for ${updated.email}`,
					metadata: { email: updated.email },
				});
			}
			return updated;
		});
	} catch (error) {
		const writeError = resolveAccountWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ user: sanitizeUser(account) });
}
