import bcrypt from "bcryptjs";
import { json, jsonError, recordAuditLog, requireAdmin, sanitizeUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildAdminUserPagination,
	createAdminUserWhere,
	normalizeAdminUserCreatePayload,
	resolveUserWriteError,
} from "@/lib/user-admin.mjs";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createAdminUserWhere({
		q: searchParams.get("q") || searchParams.get("search"),
		role: searchParams.get("role"),
		status: searchParams.get("status"),
	});
	const total = await prisma.user.count({ where });
	const pagination = buildAdminUserPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const users = await prisma.user.findMany({
		where,
		include: { store: true },
		orderBy: { email: "asc" },
		skip: pagination.skip,
		take: pagination.take,
	});
	return json({ users: users.map(sanitizeUser), pagination });
}

export async function POST(request) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeAdminUserCreatePayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const existing = await prisma.user.findUnique({ where: { email: payload.email } });
	if (existing) return jsonError("Email is already registered", 409);

	let user;
	try {
		const hashedPassword = await bcrypt.hash(payload.password, 10);
		user = await prisma.$transaction(async (tx) => {
			const created = await tx.user.create({
				data: {
					name: payload.name,
					email: payload.email,
					password: hashedPassword,
					role: payload.role,
				},
				include: { store: true },
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "USER_CREATED",
				targetType: "user",
				targetId: created.id,
				summary: `Created user ${created.email}`,
				metadata: { email: created.email, role: created.role },
			});
			return created;
		});
	} catch (error) {
		const writeError = resolveUserWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ user: sanitizeUser(user) }, { status: 201 });
}
