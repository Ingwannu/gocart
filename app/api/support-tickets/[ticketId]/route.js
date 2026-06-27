import {
	json,
	jsonError,
	recordAuditLog,
	requireAdmin,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeSupportTicketPatchPayload,
	resolveSupportTicketWriteError,
} from "@/lib/support-ticket.mjs";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { ticketId } = await params;
	const body = await request.json();
	let data;
	try {
		data = normalizeSupportTicketPatchPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let ticket;
	try {
		ticket = await prisma.$transaction(async (tx) => {
			const updated = await tx.supportTicket.update({
				where: { id: ticketId },
				data,
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "SUPPORT_TICKET_UPDATED",
				targetType: "support_ticket",
				targetId: updated.id,
				summary: `Updated support ticket ${updated.subject}`,
				metadata: {
					email: updated.email,
					status: updated.status,
					fields: Object.keys(data),
				},
			});
			return updated;
		});
	} catch (error) {
		const writeError = resolveSupportTicketWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ ticket });
}
