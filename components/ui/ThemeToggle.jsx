"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function useIsMounted() {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
}

// Ported from the saas template. Renders a stable placeholder until mounted so
// SSR markup never disagrees with the client-resolved theme.
export default function ThemeToggle({ className = "" }) {
	const mounted = useIsMounted();
	const { setTheme, resolvedTheme } = useTheme();

	if (!mounted) {
		return (
			<button
				className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-frame transition-colors hover:bg-muted ${className}`}
				aria-label="Toggle theme"
				type="button"
				disabled
			>
				<span className="h-5 w-5" />
			</button>
		);
	}

	const isDark = resolvedTheme === "dark";
	return (
		<button
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-frame transition-colors hover:bg-muted ${className}`}
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			aria-pressed={isDark}
			type="button"
		>
			{isDark ? (
				<Sun className="h-5 w-5 text-foreground" aria-hidden="true" />
			) : (
				<Moon className="h-5 w-5 text-foreground" aria-hidden="true" />
			)}
		</button>
	);
}
