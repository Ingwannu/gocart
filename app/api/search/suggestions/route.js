import { json } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildSearchSuggestionWhere,
	normalizeSearchSuggestionQuery,
	parseSearchSuggestions,
} from "@/lib/search-suggestions.mjs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const { query, limit } = normalizeSearchSuggestionQuery({
		q: searchParams.get("q") || searchParams.get("search"),
		limit: searchParams.get("limit"),
	});

	if (!query) {
		return json(parseSearchSuggestions());
	}

	const where = buildSearchSuggestionWhere(query);
	const [products, groups, categories, stores] = await Promise.all([
		prisma.product.findMany({
			where: where.products,
			include: { store: true },
			orderBy: { createdAt: "desc" },
			take: limit,
		}),
		prisma.productGroup.findMany({
			where: where.groups,
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			take: limit,
		}),
		prisma.productCategory.findMany({
			where: where.categories,
			orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			take: limit,
		}),
		prisma.store.findMany({
			where: where.stores,
			orderBy: { name: "asc" },
			take: limit,
		}),
	]);

	return json(parseSearchSuggestions({ products, groups, categories, stores }));
}
