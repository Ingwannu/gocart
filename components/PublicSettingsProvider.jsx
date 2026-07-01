"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/http";

const PublicSettingsContext = createContext({
	currencySymbol: "$",
});

export function PublicSettingsProvider({ children }) {
	const [settings, setSettings] = useState({ currencySymbol: "$" });

	useEffect(() => {
		let active = true;
		fetchJson("/api/settings/public")
			.then((data) => {
				if (!active) return;
				setSettings({
					currencySymbol: data.settings?.currencySymbol || "$",
				});
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	const value = useMemo(
		() => ({ currencySymbol: settings.currencySymbol || "$" }),
		[settings.currencySymbol],
	);

	return (
		<PublicSettingsContext.Provider value={value}>
			{children}
		</PublicSettingsContext.Provider>
	);
}

export function useCurrencySymbol() {
	return useContext(PublicSettingsContext).currencySymbol;
}
