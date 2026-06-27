export async function uploadFiles(files, options = {}) {
	const selectedFiles = Array.from(files || []).filter(Boolean);
	if (!selectedFiles.length) return [];

	const formData = new FormData();
	if (options.purpose) formData.append("purpose", options.purpose);
	for (const file of selectedFiles) {
		formData.append("files", file);
	}

	const response = await fetch("/api/uploads", {
		method: "POST",
		body: formData,
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data.error || "Upload failed");
	}

	return data.uploads || [];
}
