import bcrypt from "bcryptjs";
import { json, jsonError, sanitizeUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizePublicSignupPayload,
	resolveUserWriteError,
} from "@/lib/user-admin.mjs";

export async function POST(request) {
	const body = await request.json();
	let payload;
	try {
		payload = normalizePublicSignupPayload(body, {
			requirePasswordConfirmation: true,
		});
	} catch (error) {
		return jsonError(error.message);
	}

	const existing = await prisma.user.findUnique({ where: { email: payload.email } });
	if (existing) return jsonError("Email is already registered", 409);

	const password = await bcrypt.hash(payload.password, 10);
	let user;
	try {
		user = await prisma.user.create({
			data: {
				name: payload.name,
				email: payload.email,
				password,
				role: payload.role,
			},
		});
	} catch (error) {
		const writeError = resolveUserWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ user: sanitizeUser(user) }, { status: 201 });
}
