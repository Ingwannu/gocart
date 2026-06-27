export function normalizeInternalRedirect(value, fallback = "/") {
	const redirect = String(value || "").trim();
	if (!redirect) return fallback;
	if (!redirect.startsWith("/") || redirect.startsWith("//")) return fallback;

	try {
		const url = new URL(redirect, "https://wickedshop.local");
		if (url.origin !== "https://wickedshop.local") return fallback;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}
