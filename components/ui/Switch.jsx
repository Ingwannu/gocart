"use client";
import { cn } from "@/lib/cn";

// On/off toggle. Use for instant-effect settings; use a checkbox when the
// change only applies after a save button (docs §4.5).
export default function Switch({ checked, onChange, disabled = false, className = "", ...props }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange?.(!checked)}
			className={cn(
				"focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
				checked ? "bg-accent" : "bg-muted border border-border",
				className,
			)}
			{...props}
		>
			<span
				className={cn(
					"inline-block h-4.5 w-4.5 transform rounded-full bg-frame shadow-sm transition-transform",
					checked ? "translate-x-5.5" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
