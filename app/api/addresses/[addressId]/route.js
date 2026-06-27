import { json, jsonError, requireUser } from "@/lib/api";
import {
	normalizeAddressPayload,
	resolveAddressMutationBlock,
} from "@/lib/address.mjs";
import prisma from "@/lib/prisma";

async function findOwnedAddress(userId, addressId) {
	const address = await prisma.address.findFirst({
		where: { id: addressId, userId },
	});
	if (!address) return { error: jsonError("Address not found", 404) };
	return { address };
}

async function getMutationBlock(addressId) {
	const orderCount = await prisma.order.count({ where: { addressId } });
	const block = resolveAddressMutationBlock({ orderCount });
	return block ? jsonError(block.message, block.status) : null;
}

export async function PATCH(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { addressId } = await params;
	const owned = await findOwnedAddress(user.id, addressId);
	if (owned.error) return owned.error;

	const block = await getMutationBlock(addressId);
	if (block) return block;

	const body = await request.json();
	let data;
	try {
		data = normalizeAddressPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const address = await prisma.address.update({
		where: { id: addressId },
		data,
	});

	return json({ address });
}

export async function DELETE(_request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { addressId } = await params;
	const owned = await findOwnedAddress(user.id, addressId);
	if (owned.error) return owned.error;

	const block = await getMutationBlock(addressId);
	if (block) return block;

	await prisma.address.delete({ where: { id: addressId } });
	return json({ ok: true });
}
