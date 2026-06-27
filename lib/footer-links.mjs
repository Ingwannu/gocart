import { buildShopHref } from "./product-list.mjs";

const productSearches = [
	{ labelKey: "footer.minecraftPlugins", search: "Minecraft Plugins" },
	{ labelKey: "footer.serverPacks", search: "Server Packs" },
	{ labelKey: "footer.websites", search: "Websites" },
	{ labelKey: "footer.discordBots", search: "Discord Bots" },
];

export function getFooterProductLinks() {
	return productSearches.map((item) => ({
		labelKey: item.labelKey,
		href: buildShopHref({ search: item.search }),
	}));
}

function normalizePhoneHref(phone) {
	return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

function normalizeMapHref(address) {
	const query = encodeURIComponent(String(address || "").trim()).replaceAll("%20", "+");
	return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function getFooterContactLinks({
	phone = "+1-212-456-7890",
	email = "contact@example.com",
	address = "794 Francisco, 94102",
} = {}) {
	return [
		{ label: phone, href: normalizePhoneHref(phone), type: "phone" },
		{ label: email, href: `mailto:${email}`, type: "email" },
		{ label: address, href: normalizeMapHref(address), type: "address" },
	];
}
