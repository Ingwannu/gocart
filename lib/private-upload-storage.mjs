import path from "node:path";
import {
	contentTypeForUploadFileName,
	fileNameFromPrivateUploadUrl,
} from "./upload.mjs";

export function privateUploadDirectory() {
	return path.join(process.cwd(), "storage", "private", "uploads");
}

export function resolvePrivateUpload(value) {
	const fileName = fileNameFromPrivateUploadUrl(value);
	if (!fileName) return null;
	const directoryPath = privateUploadDirectory();
	return {
		fileName,
		directoryPath,
		storagePath: path.join(directoryPath, fileName),
		contentType: contentTypeForUploadFileName(fileName),
	};
}
