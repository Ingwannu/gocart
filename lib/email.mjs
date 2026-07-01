const RESEND_EMAIL_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function isResendEmailConfigured(env = process.env) {
	const apiKey = env.apiKey ?? env.RESEND_API_KEY;
	const fromAddress = env.fromAddress ?? env.PASSWORD_RESET_FROM;
	return Boolean(apiKey?.trim() && fromAddress?.trim());
}

export async function getResolvedEmailSettings(env = process.env) {
	try {
		const { getEmailSettings } = await import("./site-settings.mjs");
		const settings = await getEmailSettings();
		return {
			apiKey: settings.apiKey || env.RESEND_API_KEY || "",
			fromAddress: settings.fromAddress || env.PASSWORD_RESET_FROM || "",
		};
	} catch {
		return {
			apiKey: env.RESEND_API_KEY || "",
			fromAddress: env.PASSWORD_RESET_FROM || "",
		};
	}
}

export function buildPasswordResetEmail({ to, resetUrl }) {
	const safeResetUrl = String(resetUrl || "");
	return {
		to,
		subject: "Reset your Wicked Shop password",
		text: [
			"We received a request to reset your Wicked Shop password.",
			"",
			`Open this link to set a new password: ${safeResetUrl}`,
			"",
			"This link expires in 60 minutes. If you did not request this, you can ignore this email.",
		].join("\n"),
		html: [
			"<p>We received a request to reset your Wicked Shop password.</p>",
			`<p><a href="${escapeHtml(safeResetUrl)}">Reset your password</a></p>`,
			"<p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>",
		].join(""),
	};
}

export async function sendEmailWithResend({
	email,
	env = process.env,
	fetchImpl = fetch,
}) {
	const settings = await getResolvedEmailSettings(env);
	if (!isResendEmailConfigured(settings)) {
		throw new Error("Resend email is not configured");
	}

	const response = await fetchImpl(RESEND_EMAIL_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${settings.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: settings.fromAddress,
			to: [email.to],
			subject: email.subject,
			text: email.text,
			html: email.html,
		}),
	});
	const data = await response.json();

	if (!response.ok) {
		throw new Error(data?.message || data?.error || "Email delivery failed");
	}

	return data;
}
