import { json, jsonError } from "@/lib/api";
import {
	buildPasswordResetEmail,
	getResolvedEmailSettings,
	isResendEmailConfigured,
	sendEmailWithResend,
} from "@/lib/email.mjs";
import prisma from "@/lib/prisma";
import {
	buildPasswordResetUrl,
	createPasswordResetBaseUrl,
	createPasswordResetExpiry,
	createPasswordResetToken,
	hashPasswordResetToken,
	normalizePasswordResetRequestPayload,
} from "@/lib/password-reset.mjs";
import { getGeneralSettings } from "@/lib/site-settings.mjs";

export async function POST(request) {
	const body = await request.json();
	let payload;
	try {
		payload = normalizePasswordResetRequestPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const user = await prisma.user.findUnique({ where: { email: payload.email } });
	let resetUrl = null;

	if (user && !user.isSuspended) {
		const [generalSettings, emailSettings] = await Promise.all([
			getGeneralSettings(),
			getResolvedEmailSettings(),
		]);
		const token = createPasswordResetToken();
		await prisma.passwordResetToken.create({
			data: {
				userId: user.id,
				tokenHash: hashPasswordResetToken(token),
				expiresAt: createPasswordResetExpiry(),
			},
		});
		resetUrl = buildPasswordResetUrl(
			createPasswordResetBaseUrl({
				env: {
					NEXTAUTH_URL: generalSettings.publicUrl || process.env.NEXTAUTH_URL,
				},
				requestOrigin: new URL(request.url).origin,
			}),
			token,
		);
		if (isResendEmailConfigured(emailSettings)) {
			await sendEmailWithResend({
				email: buildPasswordResetEmail({
					to: user.email,
					resetUrl,
				}),
				env: emailSettings,
			});
		}
	}

	const response = { ok: true };
	if (process.env.NODE_ENV !== "production" && resetUrl) {
		response.resetUrl = resetUrl;
	}
	return json(response);
}
