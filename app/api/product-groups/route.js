import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildAdminProductGroupPagination,
	createAdminProductGroupWhere,
	normalizeProductGroupPayload,
	resolveProductGroupWriteError,
} from "@/lib/product-groups.mjs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const publicOnly = searchParams.get("public") === "true";
	if (!publicOnly) {
		const { error } = await requireAdmin();
		if (error) return error;
	}

	if (publicOnly) {
		const groups = await prisma.productGroup.findMany({
			where: { isActive: true },
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		});
		return json({ groups });
	}

	const where = createAdminProductGroupWhere({
		q: searchParams.get("q"),
		active: searchParams.get("active"),
	});
	const total = await prisma.productGroup.count({ where });
	const pagination = buildAdminProductGroupPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const groups = await prisma.productGroup.findMany({
		where,
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		skip: pagination.skip,
		take: pagination.take,
	});
	return json({ groups, pagination });
}

export async function POST(request) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	let data;
	try {
		data = normalizeProductGroupPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	try {
		const group = await prisma.$transaction(async (tx) => {
			const created = await tx.productGroup.create({ data });
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "GROUP_CREATED",
				targetType: "product_group",
				targetId: created.id,
				summary: `Created product group ${created.name}`,
				metadata: { name: created.name, slug: created.slug },
			});
			return created;
		});
		return json({ group }, { status: 201 });
	} catch (error) {
		const writeError = resolveProductGroupWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}
