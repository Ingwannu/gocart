import { json, jsonError, requireAdmin } from "@/lib/api";
import {
	buildNewsletterPagination,
	createNewsletterWhere,
	normalizeNewsletterPayload,
	resolveNewsletterWriteError,
} from "@/lib/newsletter.mjs";
import prisma from "@/lib/prisma";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createNewsletterWhere({
		q: searchParams.get("q") || searchParams.get("search"),
		status: searchParams.get("status"),
	});
	const total = await prisma.newsletterSubscription.count({ where });
	const pagination = buildNewsletterPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const subscriptions = await prisma.newsletterSubscription.findMany({
		where,
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ subscriptions, pagination });
}

export async function POST(request) {
	const body = await request.json();
	let payload;
	try {
		payload = normalizeNewsletterPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let subscription;
	try {
		subscription = await prisma.newsletterSubscription.upsert({
			where: { email: payload.email },
			create: payload,
			update: {
				isActive: true,
				unsubscribedAt: null,
			},
		});
	} catch (error) {
		const writeError = resolveNewsletterWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ subscription }, { status: 201 });
}
