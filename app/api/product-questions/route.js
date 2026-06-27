import {
	json,
	jsonError,
	recordAuditLog,
	requireAdmin,
	requireSellerStore,
	requireUser,
} from "@/lib/api";
import {
	createProductQuestionProductWhere,
	createProductQuestionWhere,
	normalizeProductQuestionPayload,
} from "@/lib/product-question.mjs";
import prisma from "@/lib/prisma";

function parseQuestion(question) {
	return {
		...question,
		user: question.user
			? {
					id: question.user.id,
					name: question.user.name,
					image: question.user.image,
				}
			: question.user,
		product: question.product,
	};
}

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const scope = searchParams.get("scope") || "public";
	let storeId = null;

	if (scope === "admin") {
		const { error } = await requireAdmin();
		if (error) return error;
	} else if (scope === "store") {
		const { store, error } = await requireSellerStore();
		if (error) return error;
		storeId = store.id;
	}

	const where = createProductQuestionWhere({
		scope,
		productId: searchParams.get("productId"),
		storeId,
		status: searchParams.get("status"),
		q: searchParams.get("q"),
	});

	const questions = await prisma.productQuestion.findMany({
		where,
		include: {
			user: true,
			product: {
				select: {
					id: true,
					name: true,
					storeId: true,
					store: { select: { id: true, name: true, username: true } },
				},
			},
		},
		orderBy: { createdAt: "desc" },
		take: 100,
	});

	return json({ questions: questions.map(parseQuestion) });
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeProductQuestionPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const product = await prisma.product.findFirst({
		where: createProductQuestionProductWhere(payload.productId),
		select: { id: true, name: true, storeId: true },
	});
	if (!product) return jsonError("Product not found", 404);

	const question = await prisma.$transaction(async (tx) => {
		const created = await tx.productQuestion.create({
			data: {
				productId: product.id,
				userId: user.id,
				question: payload.question,
			},
			include: {
				user: true,
				product: {
					select: {
						id: true,
						name: true,
						storeId: true,
						store: { select: { id: true, name: true, username: true } },
					},
				},
			},
		});
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_QUESTION_CREATED",
			targetType: "product",
			targetId: product.id,
			summary: `Asked a question about ${product.name}`,
			metadata: { questionId: created.id, productId: product.id },
		});
		return created;
	});

	return json({ question: parseQuestion(question) }, { status: 201 });
}
