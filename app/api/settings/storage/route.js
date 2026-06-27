import { json, jsonError, requireAdmin } from "@/lib/api";
import {
	getStorageSettings,
	saveStorageSettings,
	maskSecret,
} from "@/lib/site-settings.mjs";

export async function GET() {
	const { error } = await requireAdmin();
	if (error) return error;

	const settings = await getStorageSettings();
	return json({
		settings: {
			backend: settings.backend,
			endpoint: settings.endpoint,
			region: settings.region,
			bucket: settings.bucket,
			accessKeyId: settings.accessKeyId,
			secretAccessKeyMasked: maskSecret(settings.secretAccessKey),
			forcePathStyle: settings.forcePathStyle,
		},
	});
}

export async function POST(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	try {
		const saved = await saveStorageSettings(body);
		return json({
			settings: {
				backend: saved.backend,
				endpoint: saved.endpoint,
				region: saved.region,
				bucket: saved.bucket,
				accessKeyId: saved.accessKeyId,
				secretAccessKeyMasked: maskSecret(saved.secretAccessKey),
				forcePathStyle: saved.forcePathStyle,
			},
		});
	} catch (error) {
		const status = String(error.message).includes("must be") ? 400 : 500;
		return jsonError(error.message, status);
	}
}
