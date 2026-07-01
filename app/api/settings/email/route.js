import { json, jsonError, requireAdmin } from "@/lib/api";
import {
	getEmailSettings,
	maskSecret,
	saveEmailSettings,
} from "@/lib/site-settings.mjs";

function toResponse(settings) {
	return {
		fromAddress: settings.fromAddress,
		apiKeyMasked: maskSecret(settings.apiKey),
	};
}

export async function GET() {
	const { error } = await requireAdmin();
	if (error) return error;

	return json({ settings: toResponse(await getEmailSettings()) });
}

export async function POST(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	try {
		return json({ settings: toResponse(await saveEmailSettings(body)) });
	} catch (error) {
		return jsonError(error.message, 400);
	}
}
