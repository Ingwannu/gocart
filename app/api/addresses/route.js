import { json, jsonError, requireUser } from "@/lib/api";
import { normalizeAddressPayload } from "@/lib/address.mjs";
import prisma from "@/lib/prisma";

export async function GET() {
	const { user, error } = await requireUser();
	if (error) return error;

	const addresses = await prisma.address.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "desc" },
	});

	return json({ addresses });
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let data;
	try {
		data = normalizeAddressPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const address = await prisma.address.create({
		data: {
			userId: user.id,
			...data,
		},
	});

	return json({ address }, { status: 201 });
}
