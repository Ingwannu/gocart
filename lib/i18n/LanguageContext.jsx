"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { getDictionary, defaultLocale } from "@/lib/i18n";
import { formatTranslation } from "@/lib/i18n/format.mjs";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
	const [locale, setLocale] = useState(defaultLocale);
	const dict = getDictionary(locale);

	const t = useCallback(
		(key, vars) => {
			const keys = key.split(".");
			let value = dict;
			for (const k of keys) {
				value = value?.[k];
			}
			// Handle interpolation: replace {var} with provided values
			if (typeof value === "function") return value;
			if (typeof value !== "string") return key;
			return formatTranslation(value, vars);
		},
		[dict],
	);

	const tInterpolate = useCallback(
		(key, vars) => {
			return t(key, vars);
		},
		[t],
	);

	const toggleLocale = useCallback(() => {
		setLocale((prev) => (prev === "ko" ? "en" : "ko"));
	}, []);

	const switchLocale = useCallback((newLocale) => {
		setLocale(newLocale);
	}, []);

	return (
		<LanguageContext.Provider
			value={{ locale, t, tInterpolate, toggleLocale, switchLocale, dict }}
		>
			{children}
		</LanguageContext.Provider>
	);
}

export function useTranslation() {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error("useTranslation must be used within a LanguageProvider");
	}
	return context;
}

export default LanguageContext;
