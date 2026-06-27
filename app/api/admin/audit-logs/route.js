import { json, parseAuditLog, requireAdmin } from "@/lib/api";
import {
	buildAdminAuditLogPagination,
	createAdminAuditLogWhere,
} from "@/lib/admin-audit-log.mjs";
import prisma from "@/lib/prisma";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createAdminAuditLogWhere({
		q: searchParams.get("q") || searchParams.get("search"),
		action: searchParams.get("action"),
		actorId: searchParams.get("actorId"),
		targetType: searchParams.get("targetType"),
		targetId: searchParams.get("targetId"),
	});
	const total = await prisma.adminAuditLog.count({ where });
	const pagination = buildAdminAuditLogPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const logs = await prisma.adminAuditLog.findMany({
		where,
		include: { actor: true },
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ logs: logs.map(parseAuditLog), pagination });
}
