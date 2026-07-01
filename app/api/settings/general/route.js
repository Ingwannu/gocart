import { json, jsonError, requireAdmin } from "@/lib/api";
import { getGeneralSettings, saveGeneralSettings } from "@/lib/site-settings.mjs";

export async function GET() {
	const { error } = await requireAdmin();
	if (error) return error;

	return json({ settings: await getGeneralSettings() });
}

export async function POST(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	try {
		return json({ settings: await saveGeneralSettings(body) });
	} catch (error) {
		const status = String(error.message).includes("must") ? 400 : 500;
		return jsonError(error.message, status);
	}
}
