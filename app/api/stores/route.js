import { json, jsonError, parseStore, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildAdminStorePagination,
	createAdminStoreWhere,
	normalizeAdminStorePayload,
	resolveGrantedOwnerRole,
	resolveStoreOwnerGrantBlock,
	resolveStoreWriteError,
} from "@/lib/store-admin.mjs";
import {
	buildPublicStorePagination,
	createPublicStoreWhere,
} from "@/lib/store-list.mjs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const username = searchParams.get("username");
	const publicOnly = searchParams.get("public") === "true";
	const status = searchParams.get("status");
	const q = searchParams.get("q") || searchParams.get("search");
	const active = searchParams.get("active");

	if (username) {
		const store = await prisma.store.findUnique({
			where: { username },
		});

		if (!store || store.status !== "approved" || !store.isActive) {
			return jsonError("Store not found", 404);
		}

		return json({ store: parseStore(store) });
	}

	if (publicOnly) {
		const where = createPublicStoreWhere({ q });
		const total = await prisma.store.count({ where });
		const pagination = buildPublicStorePagination(
			{
				page: searchParams.get("page"),
				limit: searchParams.get("limit"),
			},
			total,
		);
		const stores = await prisma.store.findMany({
			where,
			orderBy: { name: "asc" },
			skip: pagination.skip,
			take: pagination.take,
		});
		return json({ stores: stores.map(parseStore), pagination });
	}

	const { error } = await requireAdmin();
	if (error) return error;

	const where = createAdminStoreWhere({ q, status, active });
	const total = await prisma.store.count({ where });
	const pagination = buildAdminStorePagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const stores = await prisma.store.findMany({
		where,
		include: { user: true, staffMembers: { include: { user: true } } },
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ stores: stores.map(parseStore), pagination });
}

export async function POST(request) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeAdminStorePayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const owner = await prisma.user.findUnique({
		where: { email: payload.userEmail },
	});
	if (!owner) return jsonError("Owner user not found", 404);
	const ownerBlock = resolveStoreOwnerGrantBlock(owner);
	if (ownerBlock) return jsonError(ownerBlock.message, ownerBlock.status);

	const existingStore = await prisma.store.findUnique({
		where: { userId: owner.id },
	});
	if (existingStore) return jsonError("Owner already has a store", 409);

	const existingUsername = await prisma.store.findUnique({
		where: { username: payload.data.username },
	});
	if (existingUsername) return jsonError("Store username already exists", 409);

	let store;
	try {
		store = await prisma.$transaction(async (tx) => {
			const created = await tx.store.create({
				data: {
					...payload.data,
					userId: owner.id,
				},
				include: { user: true, staffMembers: { include: { user: true } } },
			});

			const nextRole = resolveGrantedOwnerRole(owner.role);
			if (nextRole !== owner.role) {
				await tx.user.update({
					where: { id: owner.id },
					data: { role: nextRole },
				});
				created.user.role = nextRole;
			}
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_CREATED",
				targetType: "store",
				targetId: created.id,
				summary: `Created store ${created.name}`,
				metadata: {
					name: created.name,
					username: created.username,
					ownerEmail: created.user.email,
					status: created.status,
					isActive: created.isActive,
				},
			});

			return created;
		});
	} catch (error) {
		const writeError = resolveStoreWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ store: parseStore(store) }, { status: 201 });
}
