import { json, requireUser } from "@/lib/api";
import { normalizeCartItems, parseStoredCart } from "@/lib/cart.mjs";
import prisma from "@/lib/prisma";

async function pruneUnavailableItems(cartItems) {
	const ids = Object.keys(cartItems);
	if (!ids.length) return {};

	const products = await prisma.product.findMany({
		where: {
			id: { in: ids },
			inStock: true,
			isArchived: false,
			store: { status: "approved", isActive: true },
		},
		select: { id: true },
	});
	const availableIds = new Set(products.map((product) => product.id));

	return Object.fromEntries(
		Object.entries(cartItems).filter(([productId]) => availableIds.has(productId)),
	);
}

export async function GET() {
	const { user, error } = await requireUser();
	if (error) return error;

	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { cart: true },
	});
	const cartItems = await pruneUnavailableItems(parseStoredCart(dbUser?.cart));

	return json({ cartItems });
}

export async function PUT(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	const cartItems = await pruneUnavailableItems(normalizeCartItems(body.cartItems));

	await prisma.user.update({
		where: { id: user.id },
		data: { cart: JSON.stringify(cartItems) },
	});

	return json({ cartItems });
}

export async function DELETE() {
	const { user, error } = await requireUser();
	if (error) return error;

	await prisma.user.update({
		where: { id: user.id },
		data: { cart: "{}" },
	});

	return json({ cartItems: {} });
}
