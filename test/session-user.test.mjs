import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyCurrentSessionUser,
	resolveCurrentSessionUser,
} from "../lib/session-user.mjs";

describe("resolveCurrentSessionUser", () => {
	it("uses the current database role instead of a stale session role", () => {
		assert.deepEqual(
			resolveCurrentSessionUser(
				{ id: "user_1", role: "admin" },
				{
					id: "user_1",
					name: "Member",
					email: "member@example.com",
					image: "",
					role: "user",
				},
			),
			{
				id: "user_1",
				name: "Member",
				email: "member@example.com",
				image: "",
				role: "user",
			},
		);
	});

	it("rejects missing, deleted, or mismatched users", () => {
		assert.equal(resolveCurrentSessionUser(null, { id: "user_1" }), null);
		assert.equal(resolveCurrentSessionUser({ id: "user_1" }, null), null);
		assert.equal(
			resolveCurrentSessionUser({ id: "user_1" }, { id: "user_2" }),
			null,
		);
	});

	it("rejects suspended users even when the session token is otherwise valid", () => {
		assert.equal(
			resolveCurrentSessionUser(
				{ id: "user_1", role: "user" },
				{
					id: "user_1",
					name: "Suspended",
					email: "suspended@example.com",
					image: "",
					role: "user",
					isSuspended: true,
				},
			),
			null,
		);
	});
});

describe("applyCurrentSessionUser", () => {
	it("replaces stale client session fields with current database user fields", () => {
		const session = {
			user: {
				id: "user_1",
				name: "Old Admin",
				email: "old@example.com",
				image: "old.png",
				role: "admin",
			},
		};

		assert.deepEqual(
			applyCurrentSessionUser(
				session,
				{ id: "user_1" },
				{
					id: "user_1",
					name: "Current User",
					email: "current@example.com",
					image: "current.png",
					role: "user",
				},
			),
			{
				user: {
					id: "user_1",
					name: "Current User",
					email: "current@example.com",
					image: "current.png",
					role: "user",
				},
			},
		);
	});

	it("clears invalid client session users", () => {
		assert.deepEqual(
			applyCurrentSessionUser({ user: { id: "user_1", role: "admin" } }, { id: "user_1" }, null),
			{ user: null },
		);
	});
});
