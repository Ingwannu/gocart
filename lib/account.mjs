function normalizeEmail(email) {
	const normalized = String(email || "").trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
		throw new Error("Invalid email");
	}
	return normalized;
}

function normalizeRequiredText(value, message) {
	const normalized = String(value || "").trim();
	if (!normalized) throw new Error(message);
	return normalized;
}

function normalizeOptionalText(value) {
	return String(value || "").trim();
}

export function normalizeAccountProfilePayload(body = {}) {
	const data = {};
	if (body.name !== undefined) {
		data.name = normalizeRequiredText(body.name, "Name is required");
	}
	if (body.email !== undefined) {
		data.email = normalizeEmail(body.email);
	}
	if (body.image !== undefined) {
		data.image = normalizeOptionalText(body.image);
	}
	return data;
}

export function normalizeAccountPasswordPayload(body = {}) {
	return {
		currentPassword: normalizeRequiredText(
			body.currentPassword,
			"Current password is required",
		),
		newPassword: normalizePassword(body.newPassword),
	};
}

function normalizePassword(password) {
	const value = String(password || "");
	if (value.length < 8) {
		throw new Error("New password must be at least 8 characters");
	}
	return value;
}

export function resolveAccountWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Email is already registered", status: 409 };
	}
	return null;
}
