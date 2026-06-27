export function resolveProductImageSrc(image, fallback = "/placeholder.png") {
	if (typeof image === "string" && image.trim()) return image.trim();
	if (image?.src && typeof image.src === "string") return image.src;
	return fallback;
}

export function resolveProductImages(images, fallback = "/placeholder.png") {
	const normalized = Array.isArray(images)
		? images
				.map((image) => resolveProductImageSrc(image, ""))
				.filter(Boolean)
		: [];

	return normalized.length ? normalized : [fallback];
}
