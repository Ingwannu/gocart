import { json } from "@/lib/api";
import { getPublicSettings } from "@/lib/site-settings.mjs";

export async function GET() {
	return json({ settings: await getPublicSettings() });
}
