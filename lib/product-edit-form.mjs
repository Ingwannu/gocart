import { resolveProductImageSrc } from "./product-image.mjs";
import { normalizeProductDeliveryFields } from "./digital-product.mjs";

export function normalizeProductEditForm(form) {
	const mrp = Number(form.mrp);
	const price = Number(form.price);
	const images = normalizeProductImages(form.images);
	const stockQuantity = normalizeProductStockQuantity(form.stockQuantity);
	const delivery = normalizeProductDeliveryFields(form);

	if (
		!normalizeProductTextField("name", form.name) ||
		!normalizeProductTextField("description", form.description) ||
		!normalizeProductTextField("category", form.category) ||
		images.length === 0
	) {
		throw new Error("Missing required product fields");
	}

	if (
		!Number.isFinite(mrp) ||
		!Number.isFinite(price) ||
		mrp <= 0 ||
		price <= 0 ||
		price > mrp
	) {
		throw new Error("Invalid product pricing");
	}

	return {
		name: normalizeProductTextField("name", form.name),
		description: normalizeProductTextField("description", form.description),
		category: normalizeProductTextField("category", form.category),
		groupId: form.groupId || null,
		mrp,
		price,
		inStock: Boolean(form.inStock),
		stockQuantity,
		images,
		...delivery,
	};
}

const productTextFields = new Set(["name", "description", "category"]);

export function normalizeProductTextField(field, value) {
	if (!productTextFields.has(field)) throw new Error("Invalid product field");
	const text = String(value || "").trim();
	if (!text) throw new Error("Missing required product fields");
	return text;
}

export function normalizeProductImages(images) {
	if (!Array.isArray(images)) return [];
	return images
		.map((image) => resolveProductImageSrc(image, ""))
		.map((image) => image.trim())
		.filter(Boolean);
}

export function normalizeProductStockQuantity(value) {
	if (value === undefined || value === null || value === "") return null;

	const stockQuantity = Number(value);
	if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
		throw new Error("Invalid stock quantity");
	}

	return stockQuantity;
}
