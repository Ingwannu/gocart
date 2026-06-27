import {
	json,
	jsonError,
	parseRating,
	requireAdmin,
	requireUser,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildAdminRatingPagination,
	createAdminRatingWhere,
	normalizeRatingPayload,
} from "@/lib/rating.mjs";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const where = createAdminRatingWhere({
		q: searchParams.get("q") || searchParams.get("search"),
		rating: searchParams.get("rating"),
	});
	const total = await prisma.rating.count({ where });
	const pagination = buildAdminRatingPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const ratings = await prisma.rating.findMany({
		where,
		include: {
			user: true,
			product: { include: { store: true } },
		},
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ ratings: ratings.map(parseRating), pagination });
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeRatingPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const order = await prisma.order.findFirst({
		where: {
			id: payload.orderId,
			userId: user.id,
			status: "DELIVERED",
			orderItems: { some: { productId: payload.productId } },
		},
	});
	if (!order) return jsonError("Only delivered purchases can be rated", 403);

	const savedRating = await prisma.rating.upsert({
		where: {
			userId_productId_orderId: {
				userId: user.id,
				productId: payload.productId,
				orderId: payload.orderId,
			},
		},
		update: {
			rating: payload.rating,
			review: payload.review,
		},
		create: {
			userId: user.id,
			productId: payload.productId,
			orderId: payload.orderId,
			rating: payload.rating,
			review: payload.review,
		},
		include: {
			user: true,
			product: true,
		},
	});

	return json({ rating: parseRating(savedRating) }, { status: 201 });
}
