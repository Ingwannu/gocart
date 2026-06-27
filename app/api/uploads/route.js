import { randomUUID } from "node:crypto";
import { json, jsonError, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	buildStoredUpload,
	canUploadAssets,
	createUploadStoreAccessWhere,
	validateUploadFileMeta,
} from "@/lib/upload.mjs";
import { resolvePrivateUpload } from "@/lib/private-upload-storage.mjs";
import { putObject } from "@/lib/storage.mjs";

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;
	const store = await prisma.store.findFirst({
		where: createUploadStoreAccessWhere(user),
		include: { user: true, staffMembers: true },
	});
	if (!canUploadAssets(user, store)) {
		return jsonError("Upload access is not active", 403);
	}

	const formData = await request.formData();
	const files = [...formData.getAll("files"), formData.get("file")].filter(
		(file) => file && typeof file === "object" && "arrayBuffer" in file,
	);
	if (!files.length) return jsonError("No files uploaded");
	if (files.length > 8) return jsonError("Upload at most 8 files at once");
	const purpose = String(formData.get("purpose") || "").trim();
	const visibility = purpose === "digital-download" ? "private" : "public";

	const uploads = [];
	for (const file of files) {
		const validation = validateUploadFileMeta(file);
		if (!validation.ok) return jsonError(validation.error);

		const stored = buildStoredUpload({
			uploadId: randomUUID().replaceAll("-", "").slice(0, 16),
			name: file.name,
			type: file.type,
			visibility,
		});

		// S3-compatible backends accept a readable stream, which keeps large
		// source-code bundles from being buffered in memory. Local mode still
		// needs bytes, so fall back to arrayBuffer there.
		const body = file.stream ? file.stream() : await file.arrayBuffer();
		await putObject({
			storedUrl: stored.relativeUrl,
			body,
			contentType: file.type || "application/octet-stream",
			contentLength: Number(file.size) || undefined,
		});

		uploads.push({
			name: file.name,
			type: file.type,
			size: file.size,
			url: stored.relativeUrl,
		});
	}

	return json({ uploads, upload: uploads[0] }, { status: 201 });
}
