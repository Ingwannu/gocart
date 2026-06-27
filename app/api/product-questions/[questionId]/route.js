import { json, jsonError, recordAuditLog, requireUser } from "@/lib/api";
import {
	canAnswerProductQuestion,
	canDeleteProductQuestion,
	normalizeProductQuestionAnswerPayload,
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
	};
}

export async function PATCH(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { questionId } = await params;
	const question = await prisma.productQuestion.findUnique({
		where: { id: questionId },
		include: {
			user: true,
			product: { include: { store: { include: { staffMembers: true } } } },
		},
	});
	if (!question) return jsonError("Question not found", 404);
	if (!canAnswerProductQuestion(user, question)) return jsonError("Forbidden", 403);

	const body = await request.json();
	let payload;
	try {
		payload = normalizeProductQuestionAnswerPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const updated = await prisma.$transaction(async (tx) => {
		const nextQuestion = await tx.productQuestion.update({
			where: { id: questionId },
			data: {
				answer: payload.answer,
				answeredBy: user.id,
				answeredAt: new Date(),
			},
			include: {
				user: true,
				product: { include: { store: { include: { staffMembers: true } } } },
			},
		});
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_QUESTION_ANSWERED",
			targetType: "productQuestion",
			targetId: questionId,
			summary: `Answered product question ${questionId}`,
			metadata: {
				productId: question.productId,
				storeId: question.product.storeId,
			},
		});
		return nextQuestion;
	});

	return json({ question: parseQuestion(updated) });
}

export async function DELETE(_request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { questionId } = await params;
	const question = await prisma.productQuestion.findUnique({
		where: { id: questionId },
		include: {
			product: { include: { store: { include: { staffMembers: true } } } },
		},
	});
	if (!question) return jsonError("Question not found", 404);
	if (!canDeleteProductQuestion(user, question)) return jsonError("Forbidden", 403);

	await prisma.$transaction(async (tx) => {
		await tx.productQuestion.delete({ where: { id: questionId } });
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_QUESTION_DELETED",
			targetType: "productQuestion",
			targetId: questionId,
			summary: `Deleted product question ${questionId}`,
			metadata: {
				productId: question.productId,
				storeId: question.product.storeId,
				actorRole: user.role,
			},
		});
	});

	return json({ ok: true });
}
