export async function fetchJson(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data.error || "Request failed");
	}

	return data;
}
