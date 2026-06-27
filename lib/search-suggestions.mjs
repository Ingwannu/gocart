import { buildShopHref } from "./product-list.mjs";
import { resolveProductImageSrc } from "./product-image.mjs";

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function parseImages(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function normalizeSearchSuggestionQuery({ q, limit } = {}) {
	const query = String(q || "").trim();
	return {
		query: query.length >= 2 ? query : "",
		limit: Math.min(normalizePositiveInteger(limit, 6), 8),
	};
}

export function buildSearchSuggestionWhere(query) {
	const stockFilter = [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }];
	return {
		products: {
			inStock: true,
			isArchived: false,
			OR: stockFilter,
			store: { status: "approved", isActive: true },
			AND: [
				{
						OR: [
							{ name: { contains: query, mode: "insensitive" } },
							{ description: { contains: query, mode: "insensitive" } },
							{ category: { contains: query, mode: "insensitive" } },
							{ store: { name: { contains: query, mode: "insensitive" } } },
						],
				},
			],
		},
		groups: {
			isActive: true,
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			],
		},
		categories: {
			isActive: true,
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			],
		},
		stores: {
			status: "approved",
			isActive: true,
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ username: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			],
		},
	};
}

export function parseSearchSuggestions({
	products = [],
	groups = [],
	categories = [],
	stores = [],
} = {}) {
	return {
		products: products.map((product) => ({
			id: product.id,
			name: product.name,
			category: product.category,
			price: product.price,
			image: resolveProductImageSrc(parseImages(product.images)[0]),
			href: `/product/${product.id}`,
			storeName: product.store?.name || "",
		})),
		groups: groups.map((group) => ({
			name: group.name,
			href: buildShopHref({ group: group.slug }),
		})),
		categories: categories.map((category) => ({
			name: category.name,
			href: buildShopHref({ category: category.name }),
		})),
		stores: stores.map((store) => ({
			name: store.name,
			href: `/shop/${store.username}`,
		})),
	};
}
