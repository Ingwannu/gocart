"use client";
import { Moon, SunDim } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

function useIsMounted() {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
}

// MagicUI-style animated theme toggle (circular reveal via the View
// Transitions API), adapted to next-themes so the choice persists across
// reloads. Falls back to an instant switch on browsers without
// document.startViewTransition (Firefox, older Safari).
export default function AnimatedThemeToggler({ className = "" }) {
	const mounted = useIsMounted();
	const buttonRef = useRef(null);
	const { setTheme, resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const toggleTheme = async () => {
		const next = isDark ? "light" : "dark";
		if (!buttonRef.current || typeof document.startViewTransition !== "function") {
			setTheme(next);
			return;
		}

		await document.startViewTransition(() => {
			flushSync(() => setTheme(next));
		}).ready;

		const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
		const x = left + width / 2;
		const y = top + height / 2;
		const maxRadius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y),
		);

		document.documentElement.animate(
			{
				clipPath: [
					`circle(0px at ${x}px ${y}px)`,
					`circle(${maxRadius}px at ${x}px ${y}px)`,
				],
			},
			{
				duration: 700,
				easing: "ease-in-out",
				pseudoElement: "::view-transition-new(root)",
			},
		);
	};

	return (
		<button
			ref={buttonRef}
			onClick={toggleTheme}
			type="button"
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			aria-pressed={mounted ? isDark : undefined}
			className={cn(
				"focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-frame text-foreground transition-colors hover:bg-muted",
				className,
			)}
		>
			{!mounted ? (
				<span className="h-5 w-5" />
			) : isDark ? (
				<SunDim className="h-5 w-5" aria-hidden="true" />
			) : (
				<Moon className="h-5 w-5" aria-hidden="true" />
			)}
		</button>
	);
}
