import { isPrivateUploadUrl } from "./upload.mjs";

const DELIVERY_TYPES = new Set(["physical", "digital"]);

function normalizeDeliveryType(value) {
	const deliveryType = String(value || "physical").trim().toLowerCase();
	return DELIVERY_TYPES.has(deliveryType) ? deliveryType : "physical";
}

function normalizeDownloadUrl(value) {
	const url = String(value || "").trim();
	if (!url) return "";
	if (isPrivateUploadUrl(url)) return url;
	throw new Error("Digital download URL must be a private upload token");
}

export function normalizeProductDeliveryFields(body = {}) {
	const deliveryType = normalizeDeliveryType(body.deliveryType);
	if (deliveryType === "physical") {
		return {
			deliveryType: "physical",
			digitalAssetName: "",
			digitalAssetUrl: "",
		};
	}

	const digitalAssetUrl = normalizeDownloadUrl(body.digitalAssetUrl);
	if (!digitalAssetUrl) {
		throw new Error("Digital products require a download file");
	}

	return {
		deliveryType: "digital",
		digitalAssetName: String(body.digitalAssetName || "").trim(),
		digitalAssetUrl,
	};
}

export function isDigitalProduct(product) {
	return product?.deliveryType === "digital";
}

export function orderRequiresShippingAddress(products = []) {
	return products.some((product) => !isDigitalProduct(product));
}

export function canAccessDigitalDownload({ user, order, productId }) {
	if (!user?.id) return { ok: false, error: "Unauthorized", status: 401 };
	if (!order) return { ok: false, error: "Order not found", status: 404 };
	if (user.role !== "admin" && order.userId !== user.id) {
		return { ok: false, error: "Forbidden", status: 403 };
	}
	if (!order.isPaid && order.status !== "DELIVERED") {
		return { ok: false, error: "Download is available after payment", status: 403 };
	}

	const item = (order.orderItems || []).find(
		(entry) => entry.productId === productId || entry.product?.id === productId,
	);
	if (!item?.product || !isDigitalProduct(item.product)) {
		return { ok: false, error: "Digital product not found", status: 404 };
	}
	if (!item.product.digitalAssetUrl) {
		return { ok: false, error: "Download file is not available", status: 404 };
	}
	if (!isPrivateUploadUrl(item.product.digitalAssetUrl)) {
		return { ok: false, error: "Download file is not available", status: 404 };
	}

	return { ok: true, item, url: item.product.digitalAssetUrl };
}

export function serializeProductDigitalFields(product, { includeDigitalAsset = false } = {}) {
	const fields = {
		deliveryType: product?.deliveryType || "physical",
		digitalAssetName: product?.digitalAssetName || "",
	};
	if (includeDigitalAsset) {
		fields.digitalAssetUrl = product?.digitalAssetUrl || "";
	}
	return fields;
}
