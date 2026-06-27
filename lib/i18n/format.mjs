export function formatTranslation(value, vars) {
	if (!vars) return value;
	return Object.entries(vars).reduce(
		(formatted, [key, replacement]) =>
			formatted.replaceAll(`{${key}}`, String(replacement)),
		value,
	);
}
