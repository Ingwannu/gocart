import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import {
	consumeDownloadGrant,
	findDownloadGrantByToken,
} from "@/lib/download-grant.mjs";
import { getObjectStream, presignGet } from "@/lib/storage.mjs";

function attachmentFileName(value, fallback) {
	const fileName = String(value || fallback || "download")
		.split(/[\\/]/)
		.pop()
		.replace(/["\r\n]/g, "_")
		.replace(/[^\x20-\x7E]/g, "_")
		.trim();
	return fileName || fallback || "download";
}

export async function GET(request, { params }) {
	const { grantId: token } = await params;

	// Resolve the grant first (no increment) so we can presign for S3 without
	// a round-trip through the app server. For local storage we fall through to
	// streaming through the app.
	const grant = await findDownloadGrantByToken(token).catch(() => null);
	if (!grant) return jsonError("Download link is invalid", 404);
	if (grant.revokedAt) {
		return jsonError("Download link has been revoked", 403);
	}
	if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
		return jsonError("Download link has expired", 403);
	}
	if (grant.downloadCount >= grant.maxDownloads) {
		return jsonError(
			"Download limit reached. Request a new link from the seller.",
			403,
		);
	}

	const storedUrl = grant.product?.digitalAssetUrl;
	const fileName = attachmentFileName(
		grant.product?.digitalAssetName,
		storedUrl?.split("/").pop(),
	);

	// S3-compatible backends: hand the browser a short-lived signed URL so the
	// bytes flow directly from object storage. We still consume the grant now
	// because the browser will fetch the presigned URL immediately.
	const presigned = await presignGet(storedUrl).catch(() => null);
	if (presigned) {
		const consumed = await consumeDownloadGrant(token);
		if (!consumed.ok) return jsonError(consumed.error, consumed.status);
		const isView =
			String(request.headers.get("purpose") || "").toLowerCase() === "view";
		if (isView) {
			return NextResponse.redirect(presigned, { status: 307 });
		}
		return NextResponse.redirect(presigned);
	}

	// Local storage: stream through the app and count the download atomically.
	const consumed = await consumeDownloadGrant(token);
	if (!consumed.ok) return jsonError(consumed.error, consumed.status);

	let stored;
	try {
		stored = await getObjectStream(storedUrl);
	} catch {
		return jsonError("Download file is not available", 404);
	}

	const headers = {
		"Content-Type": stored.contentType,
		"Content-Disposition": `attachment; filename="${fileName}"`,
		"Cache-Control": "private, no-store",
	};
	if (stored.contentLength) {
		headers["Content-Length"] = String(stored.contentLength);
	}
	return new NextResponse(stored.stream, { headers });
}
