import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getFooterContactLinks,
	getFooterProductLinks,
} from "../lib/footer-links.mjs";

describe("getFooterProductLinks", () => {
	it("links footer product categories to real shop searches", () => {
		assert.deepEqual(getFooterProductLinks(), [
			{
				labelKey: "footer.minecraftPlugins",
				href: "/shop?search=Minecraft+Plugins",
			},
			{ labelKey: "footer.serverPacks", href: "/shop?search=Server+Packs" },
			{ labelKey: "footer.websites", href: "/shop?search=Websites" },
			{ labelKey: "footer.discordBots", href: "/shop?search=Discord+Bots" },
		]);
	});
});

describe("getFooterContactLinks", () => {
	it("uses actionable contact links instead of home-page placeholders", () => {
		assert.deepEqual(
			getFooterContactLinks({
				phone: "+1-212-456-7890",
				email: "contact@example.com",
				address: "794 Francisco, 94102",
			}),
			[
				{
					label: "+1-212-456-7890",
					href: "tel:+12124567890",
					type: "phone",
				},
				{
					label: "contact@example.com",
					href: "mailto:contact@example.com",
					type: "email",
				},
				{
					label: "794 Francisco, 94102",
					href: "https://www.google.com/maps/search/?api=1&query=794+Francisco%2C+94102",
					type: "address",
				},
			],
		);
	});
});
