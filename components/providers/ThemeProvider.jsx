"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps next-themes with the Team_WICKED defaults: class strategy (`.dark` on
// <html>), following the OS theme until the user picks one via the toggler.
export default function ThemeProvider({ children }) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			{children}
		</NextThemesProvider>
	);
}
