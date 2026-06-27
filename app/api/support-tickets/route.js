import { json, jsonError, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildSupportTicketPagination,
	createSupportTicketWhere,
	normalizeSupportTicketPayload,
} from "@/lib/support-ticket.mjs";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createSupportTicketWhere({
		q: searchParams.get("q") || searchParams.get("search"),
		status: searchParams.get("status"),
	});
	const total = await prisma.supportTicket.count({ where });
	const pagination = buildSupportTicketPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const tickets = await prisma.supportTicket.findMany({
		where,
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ tickets, pagination });
}

export async function POST(request) {
	const body = await request.json();
	let payload;
	try {
		payload = normalizeSupportTicketPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const ticket = await prisma.supportTicket.create({
		data: payload,
	});

	return json({ ticket }, { status: 201 });
}
