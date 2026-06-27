import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/(public)/signup/page.jsx", import.meta.url);
const routeSource = new URL("../app/api/auth/register/route.js", import.meta.url);

describe("Signup page", () => {
	it("asks users to confirm their password before creating an account", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /confirmPassword/);
		assert.match(source, /signupPage\.confirmPasswordLabel/);
		assert.match(source, /type="password"/);
	});
});

describe("register API", () => {
	it("requires password confirmation for public self-service signup", async () => {
		const source = await readFile(routeSource, "utf8");

		assert.match(source, /requirePasswordConfirmation:\s*true/);
	});
});
