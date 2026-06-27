import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createMembershipUpgradeAuditPayload,
	createMembershipUpgradeData,
} from "../lib/membership.mjs";

describe("createMembershipUpgradeData", () => {
	it("upgrades plain users to member without overwriting elevated roles", () => {
		assert.deepEqual(createMembershipUpgradeData({ role: "user" }), {
			data: { role: "member" },
			upgraded: true,
		});
		assert.deepEqual(createMembershipUpgradeData({ role: "member" }), {
			data: {},
			upgraded: false,
		});
		assert.deepEqual(createMembershipUpgradeData({ role: "seller" }), {
			data: {},
			upgraded: false,
		});
		assert.deepEqual(createMembershipUpgradeData({ role: "admin" }), {
			data: {},
			upgraded: false,
		});
	});
});

describe("createMembershipUpgradeAuditPayload", () => {
	it("creates a compact audit log payload for member upgrades", () => {
		assert.deepEqual(
			createMembershipUpgradeAuditPayload({
				user: { id: "user_1", email: "user@example.com" },
			}),
			{
				actorId: "user_1",
				action: "MEMBERSHIP_UPGRADED",
				targetType: "user",
				targetId: "user_1",
				summary: "Upgraded user@example.com to Plus membership",
				metadata: { email: "user@example.com", role: "member" },
			},
		);
	});
});
