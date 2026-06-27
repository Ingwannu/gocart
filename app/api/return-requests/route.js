import {
	json,
	jsonError,
	parseReturnRequest,
	recordAuditLog,
	requireUser,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildReturnRequestPagination,
	createReturnRequestWhere,
	normalizeReturnRequestPayload,
	resolveReturnRequestBlock,
	resolveReturnRequestWriteError,
} from "@/lib/return-request.mjs";

const returnRequestInclude = {
	user: true,
	order: {
		include: {
			store: true,
			address: true,
			orderItems: { include: { product: { include: { store: true, rating: true } } } },
		},
	},
};

export async function GET(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const scope = searchParams.get("scope") || "buyer";
	if (scope === "admin" && user.role !== "admin") {
		return jsonError("Forbidden", 403);
	}

	const where = createReturnRequestWhere({
		scope,
		userId: user.id,
		q: searchParams.get("q"),
		status: searchParams.get("status"),
	});
	const total = await prisma.returnRequest.count({ where });
	const pagination = buildReturnRequestPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const requests = await prisma.returnRequest.findMany({
		where,
		include: returnRequestInclude,
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ requests: requests.map(parseReturnRequest), pagination });
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeReturnRequestPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const order = await prisma.order.findUnique({
		where: { id: payload.orderId },
		select: { id: true, userId: true, status: true },
	});
	const block = resolveReturnRequestBlock({ order, userId: user.id });
	if (block) return jsonError(block.message, block.status);

	let saved;
	try {
		saved = await prisma.$transaction(async (tx) => {
			const request = await tx.returnRequest.create({
				data: {
					orderId: payload.orderId,
					userId: user.id,
					reason: payload.reason,
				},
				include: returnRequestInclude,
			});
			await recordAuditLog(tx, {
				actorId: user.id,
				action: "RETURN_REQUESTED",
				targetType: "returnRequest",
				targetId: request.id,
				summary: `Requested return for order ${payload.orderId}`,
				metadata: {
					orderId: payload.orderId,
					reason: payload.reason,
				},
			});
			return request;
		});
	} catch (error) {
		const writeError = resolveReturnRequestWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ request: parseReturnRequest(saved) }, { status: 201 });
}
