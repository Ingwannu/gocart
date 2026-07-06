"use client";
import { cn } from "@/lib/cn";

// Pill tabs (saas-template nav style). Controlled: pass `value` + `onChange`.
// tabs: [{ value: "all", label: "All" }, ...]
export default function Tabs({ tabs = [], value, onChange, className = "" }) {
	return (
		<div
			role="tablist"
			className={cn(
				"inline-flex items-center gap-1 rounded-full border border-border bg-frame p-1",
				className,
			)}
		>
			{tabs.map((tab) => {
				const isActive = tab.value === value;
				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onChange?.(tab.value)}
						className={cn(
							"focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
							isActive
								? "bg-foreground text-background"
								: "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
						)}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
