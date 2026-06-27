import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildAdminProductCategoryPagination,
	createAdminProductCategoryWhere,
	normalizeProductCategoryPayload,
	resolveProductCategoryWriteError,
} from "@/lib/product-categories.mjs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const publicOnly = searchParams.get("public") === "true";
	if (!publicOnly) {
		const { error } = await requireAdmin();
		if (error) return error;
	}

	if (publicOnly) {
		const categories = await prisma.productCategory.findMany({
			where: { isActive: true },
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		});
		return json({ categories });
	}

	const where = createAdminProductCategoryWhere({
		q: searchParams.get("q"),
		active: searchParams.get("active"),
	});
	const total = await prisma.productCategory.count({ where });
	const pagination = buildAdminProductCategoryPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const categories = await prisma.productCategory.findMany({
		where,
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		skip: pagination.skip,
		take: pagination.take,
	});
	return json({ categories, pagination });
}

export async function POST(request) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	let data;
	try {
		data = normalizeProductCategoryPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	try {
		const category = await prisma.$transaction(async (tx) => {
			const created = await tx.productCategory.create({ data });
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "CATEGORY_CREATED",
				targetType: "product_category",
				targetId: created.id,
				summary: `Created product category ${created.name}`,
				metadata: { name: created.name, slug: created.slug },
			});
			return created;
		});
		return json({ category }, { status: 201 });
	} catch (error) {
		const writeError = resolveProductCategoryWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}
